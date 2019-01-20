const translate = require('node-google-translate-skidz');
const geocoder = require('geocoder');

function replaceAll(str, search, replace) {
    return str.replace(new RegExp(search, 'g'), replace);
}

function getOrderCustomerName(order) {
    return order['שם פרטי'];
}

function setOrderCustomerName(order, value) {
    order['שם פרטי'] = value;
}

function getOrderCustomerAddress(order) {
    const streetAddress = getOrderCustomerStreetAddress(order);
    const city = getOrderCustomerCity(order);
    // const country = 'ישראל';
    // const zip = getOrderCustomerZipCode(order);

    const fullAddress = `${streetAddress} ${city}`;
    return fullAddress;
}

function getOrderCustomerStreetAddress(order) {
    return order['שם משפחה'];
}

function setOrderCustomerStreetAddress(order, value) {
    order['שם משפחה'] = value;
}

function getOrderCustomerCity(order) {
    return order['שדה נוסף5'];
}

function getOrderCustomerZipCode(order) {
    return order['שדה נוסף6'];
}

// function setOrderCustomerCity(order, value) {
//     order['שדה נוסף5'] = value;
// }

function isStringEnglish(string) {
    const english = /^[A-Za-z0-9\s\/\,\.]*$/;
    return english.test(string);
}

async function translateOrders(orders) {
    const translatedOrdersTasks = orders.map(async order => {
        const fullname = getOrderCustomerName(order);
        const address = getOrderCustomerAddress(order);
        if (!fullname || !address) return order;

        const translatedName = await translateName(fullname);
        setOrderCustomerName(order, translatedName);

        const translatedAddress = await translateAddress(address);
        setOrderCustomerStreetAddress(order, translatedAddress);

        console.log(fullname, '\n', translatedName);
        console.log('--------------------------------');
        console.log(address, '\n', translatedAddress);

        console.log('');
        console.log('');
        return order;
    });

    const translatedOrders = await Promise.all(translatedOrdersTasks);
    return translatedOrders;
}

async function translateName(fullName) {
    if (isStringEnglish(fullName)) return fullName;

    const text = `קוראים לי: ${fullName}`;
    const data = await translate({ text: text, source: 'iw', target: 'en' });
    const translatedName = data.translation.replace('My name is ', '');
    return translatedName;
}

async function translateAddress(fullAddress) {
    if (isStringEnglish(fullAddress)) return fullAddress;

    return new Promise((resolve, reject) => {
        geocoder.geocode(fullAddress, (err, data) => {
            if (err || data.error_message) return reject(err || data.error_message);

            resolve(replaceAll(data.results[0].formatted_address, ',', ''));
        }, { key: '' });
    });
}

module.exports = {
    translateOrders
};
