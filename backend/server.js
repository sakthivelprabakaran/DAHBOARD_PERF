const express = require('express');
const cors = require('cors');
const path = require('path');
const setupDatabase = require('./database');

async function startServer() {
  const app = express();
  const port = 3000;
  const db = await setupDatabase();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // --- API Endpoints ---

  // --- AUTHENTICATION ---
  app.post('/api/login', async (req, res) => {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    try {
      const user = await db.get('SELECT * FROM Users WHERE username = ?', username);
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(401).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- USERS ---
  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, role FROM Users');
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- L2 EXECUTION ENDPOINTS ---
  app.get('/api/test-setup-data', async (req, res) => {
    try {
      const projects = await db.all('SELECT * FROM Projects');
      const devices = await db.all('SELECT * FROM Devices');
      const suites = await db.all('SELECT * FROM Suites');
      res.json({ projects, devices, suites });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/test-runs', async (req, res) => {
    const { project_id, device_id, suite_id, assignee_id, build } = req.body;
    if (!project_id || !device_id || !suite_id || !assignee_id || !build) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      const result = await db.run(
        'INSERT INTO TestRuns (project_id, device_id, suite_id, assignee_id, build) VALUES (?, ?, ?, ?, ?)',
        project_id, device_id, suite_id, assignee_id, build
      );
      res.status(201).json({ id: result.lastID });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/test-runs/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const testRuns = await db.all(`
        SELECT tr.*, p.name as project_name, d.name as device_name, s.name as suite_name
        FROM TestRuns tr
        JOIN Projects p ON tr.project_id = p.id
        JOIN Devices d ON tr.device_id = d.id
        JOIN Suites s ON tr.suite_id = s.id
        WHERE tr.assignee_id = ?
      `, userId);
      res.json(testRuns);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/test-runs/:runId/test-cases', async (req, res) => {
    const { runId } = req.params;
    try {
        const testRun = await db.get('SELECT suite_id FROM TestRuns WHERE id = ?', runId);
        if (!testRun) {
            return res.status(404).json({ error: 'Test Run not found' });
        }
        const testCases = await db.all('SELECT * FROM TestCases WHERE suite_id = ?', testRun.suite_id);
        res.json(testCases);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/test-results', async (req, res) => {
    const { test_run_id, test_case_id, iteration, time_ms, notes, status } = req.body;
    if (!test_run_id || !test_case_id || !iteration || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const result = await db.run(
            'INSERT INTO TestResults (test_run_id, test_case_id, iteration, time_ms, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
            test_run_id, test_case_id, iteration, time_ms, notes, status
        );
        res.status(201).json({ id: result.lastID });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
  });

  // --- L3/L4 ENDPOINTS ---
  app.get('/api/test-runs', async (req, res) => {
    try {
      const testRuns = await db.all(`
        SELECT tr.*, p.name as project_name, d.name as device_name, s.name as suite_name, u.username as assignee_name
        FROM TestRuns tr
        JOIN Projects p ON tr.project_id = p.id
        JOIN Devices d ON tr.device_id = d.id
        JOIN Suites s ON tr.suite_id = s.id
        JOIN Users u ON tr.assignee_id = u.id
      `);
      res.json(testRuns);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/test-runs/:runId', async (req, res) => {
    const { runId } = req.params;
    const { status, assignee_id } = req.body;
    // Add more fields to update as needed
    try {
      if (status) {
        await db.run('UPDATE TestRuns SET status = ? WHERE id = ?', status, runId);
      }
      if (assignee_id) {
        await db.run('UPDATE TestRuns SET assignee_id = ? WHERE id = ?', assignee_id, runId);
      }
      res.json({ success: true, message: 'Test run updated' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/reports/summary', async (req, res) => {
    try {
        const totalRuns = await db.get('SELECT COUNT(*) as count FROM TestRuns');
        const completedRuns = await db.get("SELECT COUNT(*) as count FROM TestRuns WHERE status = 'Completed'");
        const issuesFlagged = await db.get("SELECT COUNT(*) as count FROM TestResults WHERE status = 'Flagged for Review'");
        const passRate = await db.get("SELECT CAST(SUM(CASE WHEN status = 'Pass' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as rate FROM TestResults");

        res.json({
            totalRuns: totalRuns.count,
            completedRuns: completedRuns.count,
            issuesFlagged: issuesFlagged.count,
            passRate: passRate.rate || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/projects/status', async (req, res) => {
    try {
        const projects = await db.all('SELECT * FROM Projects');
        const projectStatus = [];
        for (const project of projects) {
            const total = await db.get('SELECT COUNT(*) as count FROM TestRuns WHERE project_id = ?', project.id);
            const completed = await db.get("SELECT COUNT(*) as count FROM TestRuns WHERE project_id = ? AND status = 'Completed'", project.id);
            projectStatus.push({
                ...project,
                total_runs: total.count,
                completed_runs: completed.count,
                progress: total.count > 0 ? (completed.count / total.count) * 100 : 0
            });
        }
        res.json(projectStatus);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer().catch(console.error);
