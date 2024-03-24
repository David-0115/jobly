const { BadRequestError } = require("../expressError");

/*
* Used in patch routes to enable partial updates.
* Currently called by USER and COMPANIES models.
*
* Takes JSON from caller (req.body), and JS to SQL formatted
* column names.
* EX: jsToSql 
      {
        numEmployees: "num_employees", 
        logoUrl: "logo_url",
      });
* Then returns column and value formatted to 
* use in UPDATE SQL query.
* 
* USER Data can inculde:
*   { firstName, lastName, password, email, isAdmin }
*
* COMPANIES Data can include:
*   {name, description, numEmployees, logoUrl}
*
* Returns:
* {setCols: ["col1"=$1, "col2"=$2], values:[val1, val2]}
*
* Returned data uses:
* sqlQuery = `UPDATE table SET ${setCols}..., [...values]
*
*
* Throws error if no dataToUpdate
*
*/

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);

  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );


  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
