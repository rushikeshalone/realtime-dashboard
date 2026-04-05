const { fetchData } = require('./worker');
fetchData('top_cards', null).then(r => {
  console.log("RESULT TOP CARDS:");
  console.log(JSON.stringify(r[0], null, 2));
  process.exit(0);
}).catch(e => {
  console.error("ERROR:", e);
  process.exit(1);
});
