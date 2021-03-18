const express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var showdown = require("showdown");
var converter = new showdown.Converter();
var documentHub = require("documenthub");
var settings = require("./settings.js");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//setup public folder
app.use(express.static("./public"));

// parse application/x-www-form-urlencoded
app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);

// parse application/json
app.use(bodyParser.json());

const catalogId =
    process.env.CATALOGID || process.env.catalogid || settings.catalogid;

// homepage
app.get("/", async (req, res) => {
    let catalog = await documentHub.getCatalog(catalogId);
    //load all posts ordered by date desc
    let searchResult = await documentHub.advancedSearch(catalogId, {
        filter: {
            and: {
                "catalog.document.documentId": {
                    regexi: "^post-",
                },
            },
        },
        sort: {
            "document.date": "desc",
        },
    });
    // console.log(JSON.stringify(searchResult, null, 2));
    let documents = searchResult.results;
    //render
    res.render("pages/home", {
        documents: documents,
        catalog: catalog,
        nav: await getNav(),
    });
});

// post
app.get("/post/:docId", async (req, res) => {
    let docId = req.params.docId;
    //load document
    let document = await documentHub.getDocument(catalogId, docId);
    attachmentsBaseUrl = document.attachmentsBaseUrl;
    //load content
    let contents = await documentHub.getDocumentContents(catalogId, docId);
    let html = "";
    for (let c of contents) {
        if (c.file.endsWith(".md")) {
            html += "\n" + converter.makeHtml(c.content);
        } else html += "\n" + c.content;
    }
    //fix attachments
    html = html.replace(
        / src="_/g,
        ' class="max100" src=" ' + attachmentsBaseUrl + "/_"
    );
    //render
    res.render("pages/post", {
        document: document,
        content: html,
        nav: await getNav(),
    });
});

// page
app.get("/page/:docId", async (req, res) => {
    let docId = req.params.docId;
    //load document
    let document = await documentHub.getDocument(catalogId, docId);
    attachmentsBaseUrl = document.attachmentsBaseUrl;
    //load content
    let contents = await documentHub.getDocumentContents(catalogId, docId);
    let html = "";
    for (let c of contents) {
        if (c.file.endsWith(".md")) {
            html += "\n" + converter.makeHtml(c.content);
        } else html += "\n" + c.content;
    }
    //fix attachments
    html = html.replace(
        / src="_/g,
        ' style="max-width: 100%;" src=" ' + attachmentsBaseUrl + "/_"
    );
    //render
    res.render("pages/page", {
        content: html,
        nav: await getNav(),
    });
});

async function getNav() {
    let catalog = await documentHub.getCatalog(catalogId);
    let searchResult = await documentHub.advancedSearch(catalogId, {
        filter: {
            "document.nav": {
                gt: "",
            },
        },
    });
    let documents = searchResult.results;
    let nav = { navigation: [], catalog: catalog };
    for (let d of documents) {
        if (d.document.nav) {
            let n = {
                id: d.catalog.document.documentId,
                name: d.document.nav,
            };
            nav.navigation.push(n);
        }
    }
    return nav;
}

const port = process.env.VCAP_APP_PORT || 3000;
app.listen(port, () => console.log(`Demo Blog app Started on port ${port}!`));
