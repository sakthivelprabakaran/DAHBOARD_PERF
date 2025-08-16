const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function setupDatabase() {
  const db = await open({
    filename: './perf_dashboard.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('L2', 'L3', 'L4'))
    );

    CREATE TABLE IF NOT EXISTS Projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS Devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS Suites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS TestCases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suite_id INTEGER,
      name TEXT NOT NULL,
      steps TEXT,
      n_points INTEGER,
      FOREIGN KEY (suite_id) REFERENCES Suites(id)
    );

    CREATE TABLE IF NOT EXISTS TestRuns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      device_id INTEGER,
      suite_id INTEGER,
      assignee_id INTEGER,
      build TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES Projects(id),
      FOREIGN KEY (device_id) REFERENCES Devices(id),
      FOREIGN KEY (suite_id) REFERENCES Suites(id),
      FOREIGN KEY (assignee_id) REFERENCES Users(id)
    );

    CREATE TABLE IF NOT EXISTS TestResults (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_run_id INTEGER,
      test_case_id INTEGER,
      iteration INTEGER NOT NULL,
      time_ms INTEGER,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('Pass', 'Fail', 'Flagged for Review')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_run_id) REFERENCES TestRuns(id),
      FOREIGN KEY (test_case_id) REFERENCES TestCases(id)
    );
  `);

  return db;
}

module.exports = setupDatabase;
