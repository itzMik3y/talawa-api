const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;
const readline = require('readline-sync');
const ini = require('ini');

let DB_URL = "";

let config = {
    "AccessTokenSecret": {"ACCESS_TOKEN_SECRET": ""},
    "RefreshTokenSecret": {"REFRESH_TOKEN_SECRET": ""},
    "DBConnectionString": {"MONGO_DB_URL=": ""},
    "reCAPTCHASecretKey": {"RECAPTCHA_SECRET_KEY": ""},
    "MailUsername": {"MAIL_USERNAME": ""},
    "MailPassword": {"MAIL_PASSWORD": ""},
}

let ENV_VARS = {
    "ACCESS_TOKEN_SECRET": "",
    "REFRESH_TOKEN_SECRET": "",
    "MONGO_DB_URL": "",
    "RECAPTCHA_SECRET_KEY": "",
    "MAIL_USERNAME": "",
    "MAIL_PASSWORD": "",
}



function check_env_file() {
    // Check if the .env file contains all section headers as intended.
    if (!fs.existsSync('.env')) {
        fs.copyFileSync('.env.template', '.env');
    } else {
        const templateConfig = ini.parse(fs.readFileSync('.env.template', 'utf-8'));
        const envConfig = ini.parse(fs.readFileSync('.env', 'utf-8'));

        const templateSections = Object.keys(templateConfig);
        const envSections = Object.keys(envConfig);

        if (JSON.stringify(templateSections.sort()) !== JSON.stringify(envSections.sort())) {
            console.log("The current .env file does not match the .env.template file. The .env file will be replaced with the .env.template file.");
            fs.copyFileSync('.env.template', '.env');
        }
    }
}
function access_and_refresh_tokens(access_token_secret, refresh_token_secret) {
    // Generate and updates the access and refresh token secrets in '.env' file.
    if (access_token_secret === null) {
        access_token_secret = crypto.randomBytes(32).toString('base64');
        config["AccessTokenSecret"]["ACCESS_TOKEN_SECRET"] = access_token_secret;
        fs.writeFileSync('.env', `${config["AccessTokenSecret"]["ACCESS_TOKEN_SECRET"]}`);
    }

    if (refresh_token_secret === null) {
        refresh_token_secret = crypto.randomBytes(32).toString('base64');
        config["RefreshTokenSecret"]["REFRESH_TOKEN_SECRET"] = refresh_token_secret;
        fs.writeFileSync('.env', `${config["RefreshTokenSecret"]["REFRESH_TOKEN_SECRET"]}`);
    }
}

async function check_connection(url) {
    // Check the connection to MongoDB with the specified URL.
    try {
        const client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("\nConnection to MongoDB successful! 🎉");
        return true;
    } catch (error) {
        console.log("\nConnection to MongoDB failed. Please try again.\n");
        console.log(error);
        console.log("\nTry starting up MongoDB on your local machine");
        process.exit();
        return false;
    }
}

async function mongo_db() {
    // Request user to set up MongoDB and updates the URL in '.env' file.
    let choice = parseInt(readline.question("\nWould you like to use a local instance or a cloud instance of MongoDB?\n\n0. Local\n1. Cloud\n\nEnter choice: "))||0;
    if (choice === 0) {
        let url = "mongodb://127.0.0.1:27017/talawa-api?retryWrites=true&w=majority";
        let success = await check_connection(url);
        if (success) {
            DB_URL = url;
            config["DBConnectionString"]["MONGO_DB_URL"] = DB_URL;
            fs.writeFileSync('.env', `${config["DBConnectionString"]["MONGO_DB_URL"]}`);
        } else {
            console.log("\nConnection to MongoDB failed. Please try again.");
            console.log("\nTry starting up MongoDB on your local machine");
            process.exit();
        }
    } else if (choice === 1) {
        let cloud_instance = readline.question("\nEnter your MongoDB cloud instance URL: ");
        let success = await check_connection(cloud_instance);
        if (success) {
            DB_URL = cloud_instance;
            config["DBConnectionString"]["M```javascript MONGO_DB_URL"] = DB_URL;
            fs.writeFileSync('.env', `${config["DBConnectionString"]["MONGO_DB_URL"]}`);
        } else {
            console.log("\nConnection to MongoDB failed. Please try again.");
            console.log("\nTry starting up MongoDB on your local machine");
            process.exit();
        }
        DB_URL = cloud_instance;
    } else {
        console.log("\nInvalid choice. Please try again.\n");
        process.exit();
    }
}

function recaptcha() {
    // Request user to set up reCAPTCHA and updates the secret key in '.env' file.
    console.log("\nPlease visit this URL to set up reCAPTCHA:\n\nhttps://www.google.com/recaptcha/admin/create");
    console.log("\nSelect reCAPTCHA v2");
    console.log("and the 'I'm not a robot' checkbox option\n");
    console.log("Add 'localhost in domains and accept the terms, then press submit");
    let recaptcha_secret_key = readline.question("\nEnter your reCAPTCHA secret site key: ");
    if (!validate_recaptcha(recaptcha_secret_key)) {
        console.log("Invalid reCAPTCHA secret key. Please try again.");
        recaptcha_secret_key = readline.question("\nEnter your reCAPTCHA secret site key: ");
    }
    config["reCAPTCHASecretKey"]["RECAPTCHA_SECRET_KEY"] = recaptcha_secret_key;
    fs.writeFileSync('.env', `${config["reCAPTCHASecretKey"]["RECAPTCHA_SECRET_KEY"]}`);
}

function is_valid_email(email) {
    // Check if the email is valid.
    let pattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    return pattern.test(email);
}

function validate_recaptcha(string) {
    // Check if the reCAPTCHA secret key is valid.
    let pattern = /^[a-zA-Z0-9_-]{40}$/;
    return pattern.test(string);
}

function two_factor_auth() {
    // Notifies user to set up Two-Factor Authentication on their Google Account.
    console.log("\nIMPORTANT");
    console.log("\nEnsure that you have Two-Factor Authentication set up on your Google Account. Visit this URL:");
    console.log("\nhttps://myaccount.google.com\n\nselect Security and under Signing in to Google section select App Passwords.");
    console.log("Click on Select app section and choose Other(Custom name), enter talawa as the custom name and press Generate button.");
    let email = readline.question("\nEnter your email: ");
    if (!is_valid_email(email)) {
        console.log("Invalid email. Please try again.");
        email = readline.question("\nEnter your email: ");
    }
    let password = readline.questionNewPassword("Enter the generated password: ", {hideEchoBack: true});
    config["MailUsername"]["MAIL_USERNAME"] = email;
    config["MailPassword"]["MAIL_PASSWORD"] = password;
    fs.writeFileSync('.env', `${config["MailUsername"]["MAIL_USERNAME"]}`);
    fs.writeFileSync('.env', `${config["MailPassword"]["MAIL_PASSWORD"]}`);
}

async function check_super_admin() {
    // Check if a Super Admin account already exists.
    const client = await MongoClient.connect(DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db("talawa-api");
    const users_collection = db.collection("users");
    let super_admin = await users_collection.findOne({"userType": "SUPERADMIN"});
    if (super_admin) {
        console.log("\nSuper Admin account already exists with the following mail:");
        console.log(super_admin["email"]);
        return true;
    }
    console.log("\nNo Super```javascript Admin account exists. Creating one... 🎉");
    return false;
}

function abort() {
    // Aborts the installation process.
    console.log("\nInstallation process aborted. 🫠");
    process.exit();
}

async function main() {
    // Run main function to begin the installation process.
    console.log("Welcome to the Talawa API installer! 🚀");

    
        check_env_file();
        for (let key in ENV_VARS) {
            let env_value = process.env[key];
            if (env_value !== undefined) {
                ENV_VARS[key] = env_value;
            }
        }
    

    if (ENV_VARS["ACCESS_TOKEN_SECRET"] !== "") {
        console.log(`\nAccess token secret already exists with the value\nACCESS_TOKEN_SECRET = ${ENV_VARS['ACCESS_TOKEN_SECRET']}`);
    }
    let access_token_rewrite = readline.question("Would you like to generate a new access token secret? (y/n): ")||"y";

    let access_token;
    if (access_token_rewrite === "n") {
        access_token = ENV_VARS["ACCESS_TOKEN_SECRET"];
    } else if (access_token_rewrite === "y") {
        access_token = null;
    }

    if (ENV_VARS["REFRESH_TOKEN_SECRET"] !== "") {
        console.log(`\nRefresh token secret already exists with the value\nREFRESH_TOKEN_SECRET = ${ENV_VARS['REFRESH_TOKEN_SECRET']}`);
    }
    let refresh_token_rewrite = readline.question("Would you like to generate a new refresh token secret? (y/n): ")||"y";

    let refresh_token;
    if (refresh_token_rewrite === "n") {
        refresh_token = ENV_VARS["ACCESS_TOKEN_SECRET"];
    } else if (refresh_token_rewrite === "y") {
        refresh_token = null;
    }

    access_and_refresh_tokens(access_token, refresh_token);

    if (ENV_VARS["MONGO_DB_URL"] === "") {
        await mongo_db();
    } else {
        console.log(`\nMongoDB URL already exists with the value\nMONGO_DB_URL = ${ENV_VARS['MONGO_DB_URL']}`);
        let choice = readline.question("Would you like to use the same MongoDB URL? (y/n): ")||"y";
        if (choice === "n") {
            await mongo_db();
        } else if (choice === "y") {
            DB_URL = ENV_VARS["MONGO_DB_URL"];
        }
    }

    if (ENV_VARS["RECAPTCHA_SECRET_KEY"] === "") {
        recaptcha();
    } else {
        console.log(`\nreCAPTCHA secret key already exists with the value\nRECAPTCHA_SECRET_KEY = ${ENV_VARS['RECAPTCHA_SECRET_KEY']}`);
        let choice = readline.question("Would you like to use the same reCAPTCHA secret key? (y/n): ")||"y";
        if (choice === "n") {
            recaptcha();
        } else if (choice === "y") {
          
        }
    }

    if (ENV_VARS["MAIL_USERNAME"] === "") {
        two_factor_auth();
    } else {
        console.log(`\nMail username already exists with the value\nMAIL_USERNAME = ${ENV_VARS['MAIL_USERNAME']}`);
        let choice = readline.question("Would you like to use the same mail username? (y/n): ")||"y";
        if (choice === "n") {
            two_factor_auth();
        } else if (choice === "y") {
         
        }
    }

    console.log("\nCongratulations! Talawa API has been successfully installed! 🥂🎉");
    process.exit();

}

main();
