"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT 
          c.handle, 
          c.name, 
          c.description, 
          c.num_employees AS "numEmployees", 
          c.logo_url AS "logoUrl",
          JSON_AGG(
              JSON_BUILD_OBJECT(
                  'id', j.id, 
                  'title', j.title, 
                  'salary', j.salary, 
                  'equity', j.equity
              )
          ) FILTER (WHERE j.id IS NOT NULL) AS jobs
      FROM companies c
      LEFT JOIN jobs j ON c.handle = j.company_handle
      WHERE c.handle = $1
      GROUP BY c.handle, c.name, c.description, c.num_employees, c.logo_url;`,
      [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

  /*
  * Filters companies by query string
  * Returns a list of companies that meet filter criteria
  * Can filter on provided search filters:
  *    - minEmployees
  *    - maxEmployees
  *    - nameLike (will find case-insensitive, partial matches)
  * 
  * Query string could be any of these params
  * { nameLike: 'name', minEmployees: '5', maxEmployees: '500' }
  * 
  * For companies that meet the search criteria
  * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
  * 
  * Throws error if invalid query or min > max
  * 
  * Throws NotFoundError if filter returns no companies.
  * 
  */

  static async filter(query) {

    if (!query.nameLike && !query.minEmployees && !query.maxEmployees) {
      throw new BadRequestError('Invalid search criteria', 400);
    };

    if (query.minEmployees && query.maxEmployees) {
      if (+query.minEmployees > +query.maxEmployees) {
        throw new BadRequestError('Invalid request, minEmployees can not exceed maxEmployees', 400);
      };
    };


    if (query.nameLike) {
      query.nameLike = `%${query.nameLike}%`
    }

    const sqlMap = {
      nameLike: `name ILIKE`,
      minEmployees: `num_employees >=`,
      maxEmployees: `num_employees <=`
    }

    let params = [];
    let conditions = [];
    const queryKeys = Object.keys(query)

    queryKeys.forEach(key => {
      if (query[key] && sqlMap[key]) {
        params.push(query[key]);
        conditions.push(`${sqlMap[key]} $${params.length}`)
      }
    });

    const sqlWhere = conditions.join(" AND ");

    const queryStmt = `SELECT
      handle,
      name,
      description,
      num_employees AS "numEmployees",
      logo_url AS "logoUrl"
        FROM companies
          WHERE ${sqlWhere}
            ORDER BY name`;

    const result = await db.query(queryStmt, [...params]);

    const companies = result.rows

    if (!companies) throw new NotFoundError(`No companies were found matching that filter criteria.`)

    return companies;

  }
}


module.exports = Company;
