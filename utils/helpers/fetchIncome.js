const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const downloadDirectory = path.join(__dirname, '../../downloads'); // Set your download directory

// Ensure download directory exists
if (!fs.existsSync(downloadDirectory)) {
    fs.mkdirSync(downloadDirectory);
}

// Configure Chrome options
const chromeOptions = new chrome.Options();
// chromeOptions.addArguments('--headless'); // Run in headless mode
// chromeOptions.addArguments('--disable-gpu'); // Disable GPU for headless
chromeOptions.setUserPreferences({
    'download.default_directory': downloadDirectory,
    'download.prompt_for_download': false,
    'download.directory_upgrade': true,
    'safebrowsing.enabled': true,
});

function getPreviousYearAndWeek() {
    const today = new Date();
    
    // Calculate the current week's year and number
    const currentYear = today.getFullYear();
    const currentWeek = getWeekNumber(today);

    let prevYear = currentYear;
    let prevWeek = currentWeek - 1;

    // If it's the first week of the year, go to the last week of the previous year
    if (prevWeek === 0) {
        prevYear = currentYear - 1;
        prevWeek = getTotalWeeksInYear(prevYear);
    }

    return { year: prevYear, week: prevWeek };
}

function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date - firstDayOfYear + 86400000) / 86400000); // Include the current day
    return Math.ceil((dayOfYear + firstDayOfYear.getDay() - 1) / 7);
}

function getTotalWeeksInYear(year) {
    const lastDayOfYear = new Date(year, 11, 31); // December 31st
    return getWeekNumber(lastDayOfYear);
}

function decrementWeek(year, week) {
    week -= 1; // Decrease the week
    if (week < 1) {
        year -= 1; // Move to the previous year
        const lastDayOfPreviousYear = new Date(year, 11, 31); // December 31st of the previous year
        week = getISOWeek(lastDayOfPreviousYear); // Get the last ISO week of the previous year
    }
    return { year, week };
}

async function automateBoltLogin(username,password) {
    let driver;
    try {
        // Initialize the WebDriver
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .build();

        // Open the Bolt partner login page
        await driver.get('https://partners.bolt.eu/login');
        await driver.sleep(2000);

        // Accept cookies
        try {
            const acceptButton = await driver.findElement(By.css('.cb-btn-action.cb-btn-primary'));
            await acceptButton.click();
            await driver.sleep(1000);
        } catch (err) {
            console.log('No cookie accept button found, proceeding...');
        }

        // Fill in email and submit
        const emailField = await driver.findElement(By.id('username'));
        await emailField.sendKeys(username);

        const submitButton1 = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton1.click();
        await driver.sleep(1000);

        // Fill in password and submit
        const passwordField = await driver.findElement(By.id('password'));
        await passwordField.sendKeys(password);

        const submitButton2 = await driver.findElement(By.css('button[type="submit"]'));
        await submitButton2.click();
        await driver.sleep(10000);

        // Navigate to balance reports
        const balanceReportLink = await driver.findElement(By.css('a[href="/balance-reports"]'));
        await balanceReportLink.click();
        await driver.sleep(3000);

        // Calculate the previous week
        var previousDate = getPreviousYearAndWeek()

        var continueDownload = true

        var allData = []
        
        while (continueDownload) {
            // Find the link and click to download the PDF
            const targetHref = `/balance-reports/${previousDate.year}W${previousDate.week}`;

            try {
                const reportLink = await driver.findElement(By.xpath(`//a[@href='${targetHref}']`));
                await reportLink.click();
                console.log(`Downloading File: ${targetHref}`);

                // Wait for the download to complete
                await driver.sleep(5000);

                 // Process the downloaded file
                 const files = fs.readdirSync(downloadDirectory);
                 const pdfFiles = files.filter(file => file.endsWith('.pdf'));

                 const latestPdfFile = pdfFiles
                 .map(file => {
                     return {
                         file,
                         time: fs.statSync(path.join(downloadDirectory, file)).mtime.getTime()
                     };
                 })
                 .sort((a, b) => b.time - a.time)[0].file; 

                if (!latestPdfFile) {
                    console.log('No PDF file found in the download directory.');
                    return;
                }

                const oldFilePath = path.join(downloadDirectory, latestPdfFile);
                const newFileName = `${username}_${previousDate.year}_${previousDate.week}.pdf`;
                const newFilePath = path.join(downloadDirectory, newFileName);

                fs.renameSync(oldFilePath, newFilePath);
                console.log(`File renamed to: ${newFilePath}`);

                const pdfBuffer = fs.readFileSync(newFilePath);
                const pdfData = await pdfParse(pdfBuffer);

                const data = {
                    price : 0,
                    cash: 0,
                    total: 0,
                    from :null,
                    to: null,
                    net_price:0,
                    file: '',
                    has_zus: 0
                }

                const firstPageText = pdfData.text.split('\n'); // Split lines from the entire text
                const balance = firstPageText.find(line => line.includes('Weekly Balance'))?.trim();
                const inApp = parseFloat(balance.match(/(\d+\.\d+)/)?.[0])
                data.price = inApp
                data.net_price = data.price-170
                var cash = 0

                try {
                    const cashLine = firstPageText.find(line => line.includes('Cash Trips'))?.trim();
                    cash = parseFloat(cashLine.match(/[\d,.]+\s*ZŁ/));
                    data.cash = cash
                } catch(e) {
                    console.log('No cash found')
                }

                data.total = cash ? cash+inApp: inApp
                data.file = newFileName

                const dateLine = firstPageText.find(line => line.includes('Week'))?.trim();

                const dateFromStr = dateLine.match(/\d{2}\.\d{2}\.\d{4}/)?.[0];
                const [dayFrom, monthFrom, yearFrom] = dateFromStr.split('.');
                const dateFrom = new Date(`${yearFrom}-${monthFrom}-${dayFrom}`);

                const dateToStr = dateLine.match(/\d{2}\.\d{2}\.\d{4}/g);
                const [dayTo, monthTo, yearTo] = dateToStr[1].split('.');
                const dateTo = new Date(`${yearTo}-${monthTo}-${dayTo}`);

                data.from = dateFrom
                data.to = dateTo

                allData.push(data)

                previousDate = decrementWeek(previousDate.year, previousDate.week)

            } catch (err) {
                console.error(`Error locating or clicking the download link: ${err}`);
                continueDownload = false;
            }

        }

    } catch (err) {
        console.error(`An error occurred: ${err.message}`);
    } finally {
        // Close the browser
        if (driver) await driver.quit();
    }

    return allData
}

module.exports = automateBoltLogin
