let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let multer = require('multer');
let xlstojson = require('xls-to-json-lc');
let xlsxtojson = require('xlsx-to-json-lc');
const json2csv = require('json2csv').parse;
const { translateOrders } = require('./translate');

app.use(bodyParser.json());

let storage = multer.diskStorage({ // multers disk storage settings
    destination(req, file, cb) {
        cb(null, './uploads/');
    },
    filename(req, file, cb) {
        let datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
});

let upload = multer({ // multer settings
    storage: storage,
    fileFilter(req, file, callback) { // file filter
        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1)
            return callback(new Error('Wrong extension type'));

        callback(null, true);
    }
}).single('file');

/** API path that will upload the files */
app.post('/upload', (req, res) => {
    let exceltojson;
    upload(req, res, err => {
        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return;
        }

        /** Multer gives us file info in req.file object */
        if (!req.file) {
            res.json({ error_code: 1, err_desc: 'No file passed' });
            return;
        }

        /** Check the extension of the incoming file and
             *  use the appropriate module
             */
        const fileExtension = req.file.originalname.split('.')[req.file.originalname.split('.').length - 1];
        if (fileExtension === 'xlsx')
            exceltojson = xlsxtojson;
        else
            exceltojson = xlstojson;

        try {
            exceltojson({
                input: req.file.path,
                output: null, // since we don't need output.json
                lowerCaseHeaders: true
            }, async (err, result) => {
                if (err)
                    return res.json({ error_code: 1, err_desc: err, data: null });

                const orders = await translateOrders(result);
                const fields = Object.keys(orders[0]);
                const opts = { fields, quote: '' };

                const csv = json2csv(orders, opts);

                const filename = req.file.originalname.replace(fileExtension, 'csv');
                res.set({ 'Content-Disposition': `attachment; filename="${filename}"` });
                res.send(csv);

                // res.json({ error_code: 0, err_desc: null, data: csv });
            });
        }
        catch (e) {
            res.json({ error_code: 1, err_desc: 'Corupted excel file' });
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen('3000', () => {
    console.log('running on 3000...');
});
