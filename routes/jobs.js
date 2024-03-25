"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, isAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity , companyHandle}
 *
 * Returns { id, title, companyHandle, salary, equity , }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedIn, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        };

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
});

/** GET /  =>
 *   { jobs: [ { id, title, companyHandle, salary, equity , }, ...] }
 *
 * Can filter on provided search filters:
 * - title (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity 
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    try {
        let jobs;
        if (Object.keys(req.query).length === 0) {
            jobs = await Job.findAll();
        } else {
            jobs = await Job.filter(req.query);
        }
        return res.json({ jobs });
    } catch (err) {
        return next(err);
    }
});

/** GET /[handle]
 * 
 * Returns all jobs for that companies handle
 *      [{id, title, companyHandle, salary, equity}...]
 * 
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
    try {

        const jobs = await Job.get(req.params.handle);
        return res.json({ jobs });
    } catch (err) {
        return next(err);
    }
});

/** GET /id/[id]
* 
* Returns job with that id
*      {id, title, companyHandle, salary, equity}
* 
*
* Authorization required: none
*/

router.get("/id/:id", async function (req, res, next) {
    try {
        const job = await Job.getId(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});


/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, companyHandle, salary, equity }
 *
 * Authorization required: login, admin
 */

router.patch("/:id", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(+req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});



/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login , admin
 */

router.delete("/:id", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try {
        await Job.remove(+req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
});


module.exports = router;