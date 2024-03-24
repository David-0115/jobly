"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError.js");
const Job = require("./job.js");
const Company = require("./company.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", () => {
  const newJob = {
    title: "testJob",
    salary: 100000,
    equity: "0",
    companyHandle: "c1"
  };

  test("works", async () => {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: expect.any(Number),
      ...newJob
    });
  });

  test("bad request with dupe", async () => {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", () => {
  test("works: no filter", async () => {
    const jobs = await Job.findAll();
    expect(jobs).toEqual([
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

    ]);
  });
});

/************************************** get */

describe("get(handle)", () => {
  test("get by handle works", async () => {
    const jobs = await Job.get("c1");
    expect(jobs).toEqual([
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
    ]);
  });

  test("not found if no such handle", async () => {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

});



describe("get by id", () => {
  test("getId(id) works", async () => {
    const testJob = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);
    const job = await Job.getId(testJob.rows[0].id);
    expect(job).toEqual([{
      id: testJob.rows[0].id,
      title: "job1",
      companyHandle: "c1",
      salary: 10000,
      equity: "1"
    }]);
  });

  test("not found if no such id", async () => {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", () => {
  test("works", async () => {
    const updateData = {
      title: "titleChanged",
      salary: 999999,
      equity: "0"
    };
    const testJob = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);

    let job = await Job.update(testJob.rows[0].id, updateData);
    expect(job).toEqual({
      id: testJob.rows[0].id,
      title: "titleChanged",
      salary: 999999,
      equity: "0",
      companyHandle: "c1"
    });
  });

  test("update an id throws an BadRequestError", async () => {
    const updateData = {
      id: 100,
      title: "I want job #100"
    };
    try {
      const testJob = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);

      let job = await Job.update(testJob.rows[0].id, updateData);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("update companyHandle throws an BadRequestError", async () => {
    const updateData = {
      companyHandle: "c4",
    };
    try {
      const testJob = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);

      let job = await Job.update(testJob.rows[0].id, updateData);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("update with bad id throws NotFoundError", async () => {
    const updateData = {
      title: "titleChanged",
      salary: 999999,
      equity: "0"
    };
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }

  });
});

/************************************** remove */

describe("remove", () => {
  test("works", async () => {
    const testJob = await db.query(`SELECT id FROM jobs WHERE title = 'job1'`);

    await Job.remove(testJob.rows[0].id);
    const res = await db.query(
      `SELECT id FROM jobs WHERE id = ${testJob.rows[0].id}`
    );
    expect(res.rows.length).toEqual(0)
  });

  test("not found if no such job", async () => {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  })
})