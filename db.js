"use strict";
/** Database setup for jobly. */
const { Client } = require("pg");
// const { getDatabaseUri } = require("./config");
require('dotenv').config();

let dbName;

if (process.env.NODE_ENV === "test") {
  dbName = process.env.DB_TEST_NAME
} else {
  dbName = process.env.DB_NAME
}

const db = new Client({
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: dbName
})

db.connect();

module.exports = db;