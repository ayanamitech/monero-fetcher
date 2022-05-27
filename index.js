const fs = require('fs');
const path = require('path');
const process = require('process');
const axios = require('axios');
const cheerio = require('cheerio');
const cheerioTableparser = require('cheerio-tableparser');

const fetch = async () => {
  try {
    const data = await axios.get('https://monero.fail');
    return data.data;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to request list of nodes');
  }
};

const parseTable = (data) => {
  try {
    const $ = cheerio.load(data);
    cheerioTableparser($);
    const table = $('.pure-table').parsetable();
    const parsedTable = [];
    // Exclude table key which is table[n][0]
    for (let i = 1; i < table[0].length; ++i) {
      const isTor = table[0][i].includes('<img src="/static/images/tor.svg" width="15px">');
      const url = table[0][i].replace('<img src="/static/images/tor.svg" width="15px">', '');
      const health = table[1][i].includes('<span class="dot glowing-green"></span>');
      const isWebCompatible = table[2][i].includes('<img src="/static/images/success.svg" class="filter-green" width="16px">');
      const network = table[3][i];
      const dateAdded = new Date(table[4][i].split('<br>')[0]);
      const lastHeight = parseInt(table[5][i]);
      const lastChecked = table[6][i];
      // Remove all line break, space from string, split to array with </span> and filter empty string
      const history = table[7][i].replace(/(\r\n|\n|\r)/gm, '').replace(/ /g,'').split('</span>').filter(h => h);
      const historyGreen = history.filter(g => g.includes('<spanclass="dotglowing-green">') === true).length;
      const historyRed = history.filter(r => r.includes('<spanclass="dotglowing-red">') === true).length;
      const result = {
        isTor,
        url,
        health,
        isWebCompatible,
        network,
        dateAdded,
        lastHeight,
        lastChecked,
        history: {
          healthy: historyGreen,
          unhealthy: historyRed
        }
      };
      parsedTable.push(result);
    }
    return parsedTable;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to parse table');
  }
};

const writeToFile = (fileName, data) => {
  try {
    fs.writeFileSync(path.join(process.cwd(), fileName), data, { encoding: 'utf8' });
  } catch (e) {
    console.error(e);
    throw new Error('Failed to write file');
  }
};

const run = async () => {
  const data = await fetch();
  const parsedData = parseTable(data);
  const simpleData = parsedData.map(p => p.url).join(',\n');
  writeToFile('monero.json', JSON.stringify(parsedData, null, 2));
  writeToFile('monero.txt', simpleData);
};

run();
