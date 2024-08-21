import express from 'express';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config({});

const app = express();

const port = process.env.PORT || 3000;

let savedTokens = {
  access_token: 'ya29.a0AcM612w_fjfo6xaOQhbz9oph850ORrtPCdEaCeTvyLzWwDLEmQAwjHXu9vrk4FyBN1lUOhMvkc3SOt6X1qySddPhDsNWPI3WR8XNpls8te4GyBiuXnk5sFTGe_TGqjCU-yARo5tT_67N-RbtLCcJ5BFr-zEeee2ylAEQBlmcaCgYKAaESARISFQHGX2MiOYxKpjBpDg14wCTSHs-d8Q0175',
  scope: 'https://www.googleapis.com/auth/calendar',
  token_type: 'Bearer',
  expiry_date: 1724166619694,
  refresh_token: '1//0g-0W4G0nfcwNCgYIARAAGBASNwF-L9IrZ5W1AwlB0yTXNIs3LHfPOFVLpLOEyp0Qsci-z3YiBHZu7uDOg-s_5SrvY3YDAs9VKhk'
};

const scopes = [
    'https://www.googleapis.com/auth/calendar',
    // 'https://www.googleapis.com/auth/calendar.events',
];

app.get('/', (req, res) => {
  res.send(`echo: ${req.protocol}://${req.hostname}:${port}`);
});

app.get('/google', (req, res) => {
    let isTokenValid = savedTokens !== undefined && new Date(savedTokens.expiry_date) > Date.now();
    if (!isTokenValid) {
            const oauth2client = new google.auth.OAuth2(
                process.env.CLIENT_ID,
                process.env.CLIENT_SECRET,
                `${req.protocol}://${req.hostname}:${port}/google/redirect`,
            );
            const url = oauth2client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });
        res.send(url);
    } else {
        res.send('Cached token is valid');
    }
});

app.get('/google/redirect', (req, res) => {
    const oauth2client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        `${req.protocol}://${req.hostname}:${port}/google/redirect`,
    );

    oauth2client.getToken(req.query.code).then(({tokens}) => {
        console.log(tokens);
        oauth2client.setCredentials(tokens);
        savedTokens = tokens;
        res.send('Successfully authenticated');
    }).catch((error) => {
        console.log(error);
        res.send('Some error occured');
    });
});

app.get('/google/refresh', (req, res) => {
    if (savedTokens === undefined) {
        console.log('redirect to /google');
        res.redirect('/google');
    }

    let isTokenValid = new Date(savedTokens.expiry_date) > Date.now();

    if (!isTokenValid) {
        const oauth2client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
        );

        oauth2client.setCredentials(savedTokens);
        oauth2client.refreshAccessToken().then(({credentials, data}) => {
            console.log(credentials || data);
            savedTokens = credentials || data;
            oauth2client.setCredentials(savedTokens);
            res.send('Successfully refreshed token');
        }).catch((error) => {
            console.log(error);
            res.send('Some error occured');
        });
    } else {
        res.send('Cached token is valid');
    }
});

app.get('/google/schedule', (req, res) => {
    if (savedTokens === undefined) {
        console.log('redirect to /google');
        res.redirect('/google');
    }

    let isTokenValid = new Date(savedTokens.expiry_date) > Date.now();
    if (!isTokenValid) {
        console.log('redirect to /google/refresh');
        res.redirect('/google/refresh');
    }

    const oauth2client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
    );

    oauth2client.setCredentials(savedTokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2client });
    const event = {
        summary: 'Test event',
        description: 'Google add event testing.',
        start: {
            dateTime: '2024-08-28T01:00:00+05:30',
        },
        end: {
            dateTime: '2024-08-28T05:00:00+05:30',
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 30 },
            ],
        },
    };

    calendar.events.insert({
        calendarId: 'primary',
        auth: oauth2client,
        resource: event,
    }).then((event) => {
        console.log('Event created: %s', event.data);
        res.send('Event created');
    }).catch((error) => {
        console.log('Some error occured', error);
        res.send('Some error occured');
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});