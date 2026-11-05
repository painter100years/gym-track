require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const bcrypt = require('bcrypt');
const cors = require('cors');

app.use(cors());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter 
});

app.post('/api/upload-avatar/:userId', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    const { userId } = req.params;

    const query = `
      INSERT INTO user_settings (user_id, profile_image_url)
      VALUES ($1, $2)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        profile_image_url = EXCLUDED.profile_image_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    await pool.query(query, [userId, imageUrl]);

    res.json({ 
      message: 'Profile image updated successfully', 
      profile_image_url: imageUrl 
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to save avatar image' });
  }
});

app.post('/register', async (req, res) => {
    try {
        const { email, first_name, last_name, age, weight, height, user_password } = req.body;
        const hashedPassword = await bcrypt.hash(user_password, 10);
        const result = await pool.query(
            `Insert Into profile
            (email, first_name, last_name, age, weight, height, user_password)
            Values ($1, $2, $3, $4, $5, $6, $7)
            Returning user_id`,
            [email, first_name, last_name, age, weight, height, hashedPassword]    
        );

        res.json({
          message: 'User successfully registered',
          user_id: result.rows[0].user_id,
          user: {
                id: result.rows[0].user_id,
                first_name: first_name,
                last_name: last_name,
                email: email
          }
        })

    } catch (error) {
        console.error(error);

        if (error.code === '23505') {
            return res.status(409).json({
                error: 'An account with this email already exists'
            });
        }

        res.status(500).json({
            error: 'Registration failed'
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, user_password } = req.body;
        const result = await pool.query(
            `
            Select p.*,
                Coalesce(s.profile_image_url, '/favicon.svg') As profile_image_url,
                Coalesce(s.dark_mode, true) As dark_mode
            From profile p
            Left Join user_settings s on p.user_id = s.user_id
            Where p.email = $1
             `,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            user_password,
            user.user_password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        res.json({
            message: 'Login successful',
            user_id: user.user_id,
            user: {
                id: user.user_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                profile_image_url: user.profile_image_url,
                dark_mode: user.dark_mode
            }
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Login failed'
        })
    }
});

app.get('/api/settings/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT p.first_name, p.last_name, p.age, p.weight, p.height, 
                   COALESCE(s.profile_image_url, '/favicon.svg') AS profile_image_url, 
                   COALESCE(s.dark_mode, true) AS dark_mode
            FROM profile p
            LEFT JOIN user_settings s ON p.user_id = s.user_id
            WHERE p.user_id = $1
        `;
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

app.put('/api/settings/:userId', async (req, res) => {
    const { userId } = req.params;
   const { profile_image_url, dark_mode, first_name, last_name, age, weight, height } = req.body;

    try {

        await pool.query(
            `UPDATE profile SET first_name = $1, last_name = $2, age = $3, weight = $4, height = $5 WHERE user_id = $6`,
            [first_name, last_name, age, weight, height, userId]
        );

        const query = `
            Insert Into user_settings (user_id, profile_image_url, dark_mode)
            Values ($1, $2, $3)
            On Conflict (user_id)
            Do Update Set
                profile_image_url = Excluded.profile_image_url,
                dark_mode = Excluded.dark_mode,
                updated_at = Current_Timestamp
            Returning *;
        `
        const result = await pool.query(query, [userId, profile_image_url, dark_mode]);
        res.json({
            ...result.rows[0],
            first_name,
            last_name,
            age,
            weight,
            height
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

app.get('/api/progress/weight/:userId', async(req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            Select log_id, weight, logged_at
            From weight_logs
            Where user_id = $1
            Order by logged_at Asc
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch weight history'});
    }
});

app.post('/api/progress/weight/:userId', async (req, res) => {
    const { userId } = req.params;
    const { weight } = req.body;

    if (!weight || weight <= 0) {
        return res.status(400).json({ error: 'Invalid weight value' });
    }

    try {

        const checkQuery = `
            Select log_id From weight_logs
            Where user_id = $1 And Date(logged_at) = Current_Date
        `;

        const existing = await pool.query(checkQuery, [userId]);
        let logResult;
        if (existing.rows.length > 0) {
            const updateQuery = `
                Update weight_logs
                Set weight = $2, logged_at = Current_Timestamp
                Where log_id = $1
                Returning log_id, weight, logged_at
            `;
            logResult = await pool.query(updateQuery, [userId, weight]);
        } else {
            const insertQuery = `
                INSERT INTO weight_logs (user_id, weight)
                VALUES ($1, $2)
                RETURNING log_id, weight, logged_at
            `;
            logResult = await pool.query(insertQuery, [userId, weight]);
        }

        await pool.query(
            `UPDATE profile SET weight = $1 WHERE user_id = $2`,
            [weight, userId]
        );

        res.status(201).json(logResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save weight log' });
    }
});

app.get('/api/exercises', async (req, res) => {
    try {
        const query = `
            Select * From exercises Order By name Asc
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to fetch exercises'});
    }
});

app.get('/api/workouts/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT workout_id, user_id, title, workout_date, created_at
            FROM workouts
            WHERE user_id = $1 AND is_template = true
            ORDER BY workout_date DESC, created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch workouts' });
    }
});

app.post('/api/workouts/:userId', async (req, res) => {
    const {userId} = req.params;
    const {title, workout_date, is_template} = req.body;

    try {
        const query = `
            INSERT INTO workouts (user_id, title, workout_date, is_template)
            VALUES ($1, $2, COALESCE($3, CURRENT_DATE), COALESCE($4, true))
            RETURNING *
        `;
        const result = await pool.query(query, [userId, title, workout_date, is_template]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to create workout session'});
    }
});

app.get('/api/workouts/sets/:workoutId', async (req, res) => {
    const { workoutId } = req.params;
    try {
        const query = `
            SELECT ws.*, e.name AS exercise_name, e.main_muscle 
            FROM workout_sets ws
            JOIN exercises e ON ws.exercise_id = e.exercise_id
            WHERE ws.workout_id = $1
            ORDER BY ws.set_order ASC
        `;
        const result = await pool.query(query, [workoutId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch workout exercises' });
    }
});

app.post('/api/workouts/sets/:workoutId', async (req, res) => {
    const {workoutId} = req.params;
    const {sets} = req.body;

    if (!Array.isArray(sets) || sets.length === 0) {
        return res.status(400).json({error: 'No sets provided'});
    }
    try {
        const insertedSets = [];
        for (const s of sets) {
            const query = `
                Insert Into workout_sets (workout_id, exercise_id, set_count, set_order)
                Values ($1, $2, $3, $4)
                Returning *
            `;
            const result = await pool.query(query, [
                workoutId,
                s.exercise_id,
                s.set_count,
                s.exercise_order
            ]);
            insertedSets.push(result.rows[0]);
        }
        res.status(201).json({message: 'Workout routine saved successfully', sets: insertedSets});
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to save workout routine'});
    }
});


app.delete('/api/workouts/:workoutId', async (req, res) => {
    const { workoutId } = req.params;
    try {
        await pool.query('DELETE FROM workout_sets WHERE workout_id = $1', [workoutId]);
        await pool.query('DELETE FROM workouts WHERE workout_id = $1', [workoutId]);
        res.json({ message: 'Workout routine deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete workout routine' });
    }
});

app.get('/api/progress/strength/:userId', async (req, res) => {
    const {userId} = req.params;
    try {
        const query = `
            Select
            e.main_muscle,
            Max(s.weight) As max_weight,
            Max(s.reps) As max_reps
            From workout_sets s
            Join workouts w On s.workout_id = w.workout_id
            Join exercises e On s.exercise_id = e.exercise_id
            Where w.user_id = $1
            Group By e.main_muscle
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'Failed to calculate strength metrics'});
    }
});

app.post('/api/workouts/live-sets/:workoutId', async (req, res) => {
    const { workoutId } = req.params;
    const { sets } = req.body;

    if (!Array.isArray(sets) || sets.length === 0) {
        return res.status(400).json({ error: 'No sets provided' });
    }
    try {
        const insertedSets = [];
        for (const s of sets) {
            const query = `
                INSERT INTO workout_sets (workout_id, exercise_id, weight, reps, set_order)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const result = await pool.query(query, [
                workoutId,
                s.exercise_id,
                s.weight || null,
                s.reps || null,
                s.set_order
            ]);
            insertedSets.push(result.rows[0]);
        }
        res.status(201).json({ message: 'Live workout logged successfully', sets: insertedSets });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to log live workout sets' });
    }
});

app.get('/api/workouts/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT workout_id, title, workout_date
            FROM workouts
            WHERE user_id = $1 AND is_template = false
            ORDER BY workout_date DESC, created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch workout history' });
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
})