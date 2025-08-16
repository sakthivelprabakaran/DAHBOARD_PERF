const fs = require('fs/promises');
const path = require('path');
const setupDatabase = require('./database');

async function seed() {
  console.log('Starting database seeding...');
  const db = await setupDatabase();

  try {
    // Seed Users
    const usersData = await fs.readFile(path.join(__dirname, 'seed-data', 'users.json'), 'utf8');
    const users = JSON.parse(usersData);
    for (const user of users) {
      await db.run('INSERT INTO Users (username, role) VALUES (?, ?)', user.username, user.role);
    }
    console.log('Users seeded.');

    // Seed Projects
    const projectsData = await fs.readFile(path.join(__dirname, 'seed-data', 'projects.json'), 'utf8');
    const projects = JSON.parse(projectsData);
    for (const project of projects) {
      await db.run('INSERT INTO Projects (name) VALUES (?)', project.name);
    }
    console.log('Projects seeded.');

    // Seed Devices
    const devicesData = await fs.readFile(path.join(__dirname, 'seed-data', 'devices.json'), 'utf8');
    const devices = JSON.parse(devicesData);
    for (const device of devices) {
      await db.run('INSERT INTO Devices (name) VALUES (?)', device.name);
    }
    console.log('Devices seeded.');

    // Seed Suites
    const suitesData = await fs.readFile(path.join(__dirname, 'seed-data', 'suites.json'), 'utf8');
    const suites = JSON.parse(suitesData);
    for (const suite of suites) {
      await db.run('INSERT INTO Suites (name) VALUES (?)', suite.name);
    }
    console.log('Suites seeded.');

    // Seed TestCases
    const testCasesData = await fs.readFile(path.join(__dirname, 'seed-data', 'test_cases.json'), 'utf8');
    const testCases = JSON.parse(testCasesData);
    for (const testCase of testCases) {
      await db.run(
        'INSERT INTO TestCases (suite_id, name, steps, n_points) VALUES (?, ?, ?, ?)',
        testCase.suite_id,
        testCase.name,
        testCase.steps,
        testCase.n_points
      );
    }
    console.log('TestCases seeded.');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.close();
  }
}

seed();
