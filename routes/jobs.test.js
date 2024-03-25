"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    u2Token
} = require("./_testCommon");
// const { findAll } = require("../models/company");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
        title: "New Job",
        salary: 10000,
        equity: 0,
        companyHandle: "c1"
    };

    test("works", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                title: "New Job",
                salary: 10000,
                equity: "0",
                companyHandle: "c1"
            }
        });
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "new",
                salary: 1000
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "New Job",
                salary: "10000",
                equity: 0,
                companyHandle: "c1"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "job1",
                        companyHandle: "c1",
                        salary: 10000,
                        equity: "1"
                    },
                    {
                        id: expect.any(Number),
                        title: "job2",
                        companyHandle: "c2",
                        salary: 20000,
                        equity: "0"
                    },
                    {
                        id: expect.any(Number),
                        title: "job3",
                        companyHandle: "c3",
                        salary: 30000,
                        equity: "0"
                    },
                    {
                        id: expect.any(Number),
                        title: "job4",
                        companyHandle: "c1",
                        salary: 40000,
                        equity: "1"
                    }
                ],
        });
    });

    test("filter minSalary", async function () {
        const resp = await request(app).get("/jobs?minSalary=30000");
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "job3",
                        companyHandle: "c3",
                        salary: 30000,
                        equity: "0"
                    },
                    {
                        id: expect.any(Number),
                        title: "job4",
                        companyHandle: "c1",
                        salary: 40000,
                        equity: "1"
                    }
                ]
        })
    })

    test("filter title", async function () {
        const resp = await request(app).get("/jobs?title=4");
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "job4",
                        companyHandle: "c1",
                        salary: 40000,
                        equity: "1"
                    }
                ]
        })
    })

    test("filter hasEquity", async function () {
        const resp = await request(app).get("/jobs?hasEquity=true")
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "job1",
                        companyHandle: "c1",
                        salary: 10000,
                        equity: "1"
                    },
                    {
                        id: expect.any(Number),
                        title: "job4",
                        companyHandle: "c1",
                        salary: 40000,
                        equity: "1"
                    }
                ]
        });
    });

    test("can use all filters at once", async function () {
        const resp = await request(app).get("/jobs?hasEquity=true&minSalary=30000&title=job");
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "job4",
                        companyHandle: "c1",
                        salary: 40000,
                        equity: "1"
                    }
                ]
        });
    });

    test("throws error if invalid query", async function () {
        const resp = await request(app).get("/jobs?notValid=10");
        expect(resp.body).toEqual({
            "error": {
                "message": "Invalid search criteria",
                "status": 400
            }
        });
    });
});

/************************************** GET /jobs/:handle */

describe("GET /jobs/:handle", function () {
    test("works for anon", async function () {
        const resp = await request(app).get(`/jobs/c2`);
        expect(resp.body).toEqual({
            jobs:
                [
                    {
                        id: expect.any(Number),
                        title: "job2",
                        companyHandle: "c2",
                        salary: 20000,
                        equity: "0"
                    },
                ]
        });
    });

    test("invalid handle throws NotFoundError", async function () {
        const resp = await request(app).get(`/jobs/nohandle`);
        expect(resp.body).toEqual(
            {
                "error": {
                    "message": "No company: nohandle",
                    "status": 404
                }
            }
        );
    });
});

describe("GET /jobs/id:id", function () {
    test("works for anon", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app).get(`/jobs/id/${id}`);
        expect(resp.body).toEqual({
            job:
                [
                    {
                        id: id,
                        title: "job1",
                        companyHandle: "c1",
                        salary: 10000,
                        equity: "1"
                    },
                ]
        });
    });

    test("invalid id throws NotFoundError", async function () {
        const resp = await request(app).get(`/jobs/id/0`);
        expect(resp.body).toEqual(
            {
                "error": {
                    "message": "No Jobs listed with id 0",
                    "status": 404
                }
            }
        );
    });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /companies/:handle", function () {
    test("works for admins", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                title: "Updated title",
                salary: 99999
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.body).toEqual({
            job: {
                id: id,
                title: "Updated title",
                companyHandle: "c1",
                salary: 99999,
                equity: "1"
            },
        });

    });

    test("unauth for users", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                title: "C1-new",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({
            "error": {
                "message": "Unauthorized",
                "status": 401
            }
        });

    });

    test("unauth for anon", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                title: "C1-new",
            });
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({
            "error": {
                "message": "Unauthorized",
                "status": 401
            }
        });
    });

    test("not found on no such company", async function () {
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: "new nope",
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on id change attempt", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                id: "1",
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                salary: "One hundred million dollars"
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});


/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("works for admins", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.body).toEqual({ deleted: `${id}` });
    });

    test("unauth for users", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        expect(resp.body).toEqual({
            "error": {
                "message": "Unauthorized",
                "status": 401
            }
        });
    })

    test("unauth for anon", async function () {
        const jobData = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
        const id = jobData.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such company", async function () {
        const resp = await request(app)
            .delete(`/jobs/0`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});


