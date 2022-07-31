import axios from 'axios';
import inquirer from 'inquirer';
import DomParser from 'dom-parser';
import fs from 'fs';

async function main() {
    const category = await selectCategory();

    const products = await scrapeProducts(category);

    saveLinks(products, category);
}

async function selectCategory() {
    // Get body of best-sellers page
    const html = await axios.get('https://www.amazon.com/gp/bestsellers').then((res) => {
        return res.data
    }).then((body) => {
        const parser = new DomParser();
        return parser.parseFromString(body, 'text/html');
    });

    // Find category elems
    const elem =  html.getElementsByClassName('_p13n-zg-nav-tree-all_style_zg-browse-item__1rdKf _p13n-zg-nav-tree-all_style_zg-browse-height-small__nleKL');

    // Get array of category links
    const links = elem.map((value, index) => {
        return value.innerHTML.match(/(?<=href\=\")(.*)(?=\"\>)/)[0]
    });

    // Get array of category titles
    const titles = elem.map((value, index) => {
        const txt = value.innerHTML.match(/(?<=ref=zg_bs_nav_0">)(.*)(?=<\/a>)/)[0];
        return txt.replace('amp;', '');
    });

    // Sort inquirer choices
    const choices = titles.map((item, index) => {
        const obj = {};

        obj.key = index + 1;
        obj.value = item;

        return obj;
    });

    // User selects category
    // Returns corresponding link
    const selection = await inquirer.prompt({
        name: 'category',
        type: 'rawlist',
        message: 'Choose a category',
        choices: choices
    }).then((ans) => {
        const index = titles.indexOf(ans.category);
        return links[index];
    });

    return selection;
};

async function scrapeProducts(category) {
    // Get body
    const html = await axios.get(`https://www.amazon.com${category}`).then((res) => {
        return res.data
    }).then((body) => {
        const parser = new DomParser();
        return parser.parseFromString(body, 'text/html');
    });

    // Find product elems
    const elem = html.getElementsByClassName('zg-grid-general-faceout');

    // Get array of product links
    const links = elem.map((value, index) => {
        const href = value.innerHTML.match(/(?<=href\=\")(.*)(?=" role="link"><div class=)/)[0];

        return 'https://www.amazon.com/' + href;
    });

    return links;
};

function saveLinks(links, category) {
    if (!fs.existsSync('./products')) {
        fs.mkdirSync('./products')
    };

    const fileName = category.match(/(?<=\/Best-Sellers-)(.*)(?=\/zgbs)/)[0];

    fs.appendFile(`./products/${fileName}.txt`, links.join('\r\n'), (err) => {
        if (err) throw err
    });
}

main()