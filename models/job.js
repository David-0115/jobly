"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const Company = require("./company");

class Job {
    /** Create a job (from data) , update db, return new job data
     * 
     * data should be {title, salary, equity, companyHandle}
     * 
     * Returns {id, title, companyHandle, salary, equity }
     * 
     * Throws BadRequestError if exact job at the same company already in database.
     * */
    static async create({ title, salary, equity, companyHandle }) {
        const duplicateCheck = await db.query(
            `SELECT company_handle, title, salary
            FROM jobs
            WHERE company_handle = $1
            AND title = $2
            AND salary = $3`,
            [companyHandle, title, salary]
        );

        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate job: ${title} at ${companyHandle}`);

        const result = await db.query(
            `INSERT INTO jobs
                (title, salary, equity, company_handle)
                VALUES ($1,$2,$3,$4)
                RETURNING id, title, company_handle AS "companyHandle", salary, equity`,
            [title, salary, equity, companyHandle]
        );

        const job = result.rows[0]

        return job;
    };

    /** Find all jobs
     * 
     * Returns [{id, title, salary, equity, companyHandle},...]
     * 
     */

    static async findAll() {
        const jobsRes = await db.query(
            `SELECT id,
                    title,
                    company_handle AS "companyHandle",
                    salary,
                    equity 
                FROM jobs
                ORDER BY title, company_handle`
        );

        return jobsRes.rows;
    };

    /** Given a company handle, return all the jobs at that company
     * 
     * Returns {id, title , companyHandle, salary, equity}
     * 
     * Throws NotFoundError if not found
     */

    static async get(handle) {

        const handleCheck = await Company.get(handle); // throws error if handle not found

        const jobsRes = await db.query(
            `SELECT id,
                    title,
                    company_handle AS "companyHandle",
                    salary,
                    equity 
                FROM jobs
                WHERE company_handle = $1
                ORDER BY title`,
            [handle]
        );

        const jobs = jobsRes.rows

        if (!jobs) throw new NotFoundError(`No Jobs listed at ${handle}`);

        return jobs
    };

    /** Given a job id, returns the job
     * 
     * Returns {id, title , companyHandle, salary, equity}
     * 
     * Throws NotFoundError if not found
     */

    static async getId(id) {

        const jobRes = await db.query(
            `SELECT id,
                    title,
                    company_handle AS "companyHandle",
                    salary,
                    equity 
                FROM jobs
                WHERE id = $1
                ORDER BY title`,
            [id]
        );

        const job = jobRes.rows

        if (!job) throw new NotFoundError(`No Jobs listed with id ${id}`);

        return job
    };

    /**Update job data with `data`.
     * 
     * This is a "partisl update" -- it's fine if the data doesn't contail all fields;
     * this only changes provided fields
     * 
     * Data can include: {title, salary, equity}
     * 
     * Returns {id, title, companyHandle, salary, equity}
     */
    static async update(id, data) {
        if (data.id || data.companyHandle) {
            throw new BadRequestError(`Job id and companyHandle can not be changed`)
        };
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle"
            }
        );

        values.push(id)

        // const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                            SET ${setCols}
                            WHERE id = $${values.length}
                            RETURNING id,
                                      title,
                                      company_handle AS "companyHandle",
                                      salary,
                                      equity`;
        const result = await db.query(querySql, [...values]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job with id:${id}`);

        return job;
    };

    /*
* Filters jobs by query string
* Returns a list of jobs that meet filter criteria
* Can filter on provided search filters:
*    - title (will find case-insensitive, partial matches)
*    - minSalary
*    - hasEquity
* 
* Query string could be any of these params
* { title: "Engineer", minSalary: 100000, hasEquity: true}
* 
* For jobs that meet the search criteria
* Returns [{ id, title, company_handle, salary, equity }, ...]
* 
* Throws error if invalid query.
* 
* Throws NotFoundError if filter returns no companies.
* 
*/

    static async filter(query) {
        if (!query.title && !query.minSalary && !query.hasEquity) {
            throw new BadRequestError('Invalid search criteria', 400);
        }

        if (query.title) {
            query.title = `%${query.title}%`
        }

        const sqlMap = {
            title: `title ILIKE`,
            minSalary: `salary >=`,
            hasEquity: `equity ${'= 0' ? !query.hasEquity : '> 0'}`
        };

        let params = [];
        let conditions = [];
        const queryKeys = Object.keys(query)

        queryKeys.forEach(key => {
            if (query[key] && sqlMap[key]) {
                params.push(query[key]);
                conditions.push(`${sqlMap[key]} $${params.length}`)
            }
        });

        const sqlWhere = conditions.join(" AND ")

        const queryStmt = `
                SELECT id,
                       title,
                       company_handle AS companyHandle,
                       salary,
                       equity,
                    FROM jobs
                    WHERE ${sqlWhere}
                    ORDER BY title, companyHandle`;

        const result = await db.query(queryStmt, [...params]);

        const jobs = result.rows

        if (!jobs) throw new NotFoundError(`No jobs were found matching that filter criteria.`);

        return jobs;
    };

    /** Delete given job from database; returns undefined.
 *
 * Throws NotFoundError if job not found.
 **/

    static async remove(id) {
        const result = await db.query(
            `DELETE
                FROM jobs
                WHERE id = $1
                RETURNING id`,
            [id]);

        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job found with id ${id}`)
    };
}

module.exports = Job;