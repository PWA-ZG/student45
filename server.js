const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const webpush = require('web-push');

const pool = new Pool({
  connectionString: 'postgres://unam:llsvKg5hKwW253xpIrFi2s3ZvEBm6x5C@dpg-clvnl2la73kc73brmjr0-a.frankfurt-postgres.render.com/web2_lab5?ssl=true',
});

const app = express();

app.use(express.static('public'))
app.use(express.json()); 
app.use(express.urlencoded({ extended:true}));
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '20mb' }));
app.use(cors());

webpush.setVapidDetails(
  'mailto:una.maravic@fer.hr',
  'BMgWpMeZNkYyD71ojqSQBY9NWK4DAyqc-WXHIN8a9ZpQ9mR9bDRT64oWcardxo_K9QsGBzBvdd4WMh7oOk3Qj1M',
  'oUZPS5BI69wuC_4qjF23UwkFzNGfB0D6YSRgVzMmJaw'
);

const upload = multer();

app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/public/home.html');
});

app.get('/login', async (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/.well-known/pki-validation/6C2C8452BBBC2D97D0F0DA12ADEC18B0.txt', async(req,res) => {
  res.sendFile(__dirname + '/public/6C2C8452BBBC2D97D0F0DA12ADEC18B0.txt');
})

app.post('/searchUsers', async (req, res) => {
  const { username } = req.body;
  console.log(username);
  try {
    console.log("ovdje sam");
    const result = await pool.query('SELECT * FROM public.users WHERE username = $1', [username]);
    console.log("nisam")
  
    if (result.rows.length > 0) {
      console.log(result.rows[0].userid)
      pregledanProfil(result.rows[0].userid);
      res.json(result.rows);
    } else {
      res.status(404).send('Invalid username or password');
    }
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);

    if (result.rows.length > 0) {
      console.log("Ok")
      res.redirect('/');
    } else {
      res.status(401).send('Invalid username or password');
    }
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/profile', async (req, res) => {
  res.sendFile(__dirname + '/public/profil.html');
});

app.post('/upload-image', upload.single('image'), async (req, res) => {
  console.log(req.body)
  try {
    const imageTitle = req.body.imageTitle;
    const username = req.body.username;
    const base64String = req.body.base64Image;
    console.log(imageTitle + " " + username);


    let userID = await pool.query('select userID from users where username = $1', [username,]);

    userID = userID.rows[0]?.userid;
    console.log(userID);

    const query = 'INSERT INTO images (title, bytes, userID) VALUES ($1, $2, $3)';
    const values = [imageTitle, base64String, userID];
    await pool.query(query, values);

    res.json({ success: true, message: 'Slika uspješno spremljena.' });
  } catch (error) {
    console.error('Greška prilikom spremanja slike:', error);
    res.status(500).json({ success: false, message: 'Greška prilikom spremanja slike.' });
  }
});

app.get('/userImages', async (req, res) => {
  const username = req.query.username;

  try {
    const userIDResult = await pool.query('SELECT userID FROM users WHERE username = $1', [username]);
    const userID = userIDResult.rows[0]?.userid;

    if (userID) {
      const imagesResult = await pool.query('SELECT * FROM images WHERE userID = $1', [userID]);
      const images = imagesResult.rows;

      res.json(images);
    } else {
      res.status(404).json({ success: false, message: 'Korisnik nije pronađen.' });
    }
  } catch (error) {
    console.error('Greška prilikom dohvaćanja slika:', error);
    res.status(500).json({ success: false, message: 'Greška prilikom dohvaćanja slika.' });
  }
});

app.post('/like-image', async (req, res) => {
  try {
      const imageId = req.body.imageId;
      const result = await pool.query('UPDATE images SET likes = likes + 1 WHERE id = $1 RETURNING likes', [imageId]);
      console.log(result.rows[0]);
      res.json({ success: true, likes: result.rows[0]?.likes });
  } catch (error) {
      console.error('Greška prilikom lajkanja slike:', error);
      res.status(500).json({ success: false, message: 'Greška prilikom lajkanja slike.' });
  }
});

app.post('/delete-image', async (req, res) => {
  try {
    const imageId = req.body.imageId;
    await pool.query('delete from images where id = $1', [imageId,]);
    res.status(200).json({success: true})
  } catch (error) {
    console.error('Greška prilikom brisanja slike:', error);
    res.status(500).json({ success: false, message: 'Greška prilikom brisanja slike.' });
  }
});

app.post("/dodajPretplatu", async (req, res) => {
  let sub = req.body.subscription;
  const username = req.body.username;
  try {
    const result = await pool.query('select userid from users where username = $1', [username]);
    console.log(result.rows[0]);
    const userid = result.rows[0].userid;
    const response = await pool.query('insert into pretplate (endpoint, p256dh, auth, userid) values ($1, $2, $3, $4) returning id', [sub.endpoint, sub.keys.p256dh, sub.keys.auth, userid]);
    const pretplataId = response.rows[0].id;
    res.status(200).json({ success: true, pretplataId: pretplataId});
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

async function pregledanProfil(userid) {

  try {
    const response = await pool.query('select * from pretplate where userid = $1', [userid]);
    console.log(response)
    const pretplate = response.rows;

    if (pretplate.length > 0) {
      const payload = JSON.stringify({
        title: 'Profil pregledan',
        body: 'Netko je pregledao vaš profil.',
      });
      console.log('saljem notification')
      pretplate.forEach(async sub => {
        try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: {
                  auth: sub.auth,
                  p256dh: sub.p256dh,
              },
            }, payload);
        } catch (error) {
            console.error(error);
        }
      });
    }
  } catch (error) {
    console.error('Greška prilikom slanja push notifikacije:', error);
  }

}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
