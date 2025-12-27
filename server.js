import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DOMAIN = 'komiku.org';
const BASE_URL = `https://${DOMAIN}`;
const API_URL = `https://api.${DOMAIN}`;

function normalizeUrl(url) {
  if (!url || url === '') return url;
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
}

// Middleware untuk User-Agent
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// Route: Komik Terbaru
app.get('/api/latest/:page?', async (req, res) => {
  try {
    const page = req.params.page || 1;
    const response = await fetch(`${API_URL}/manga/page/${page}/`, { headers });
    const data = await response.text();
    const $ = cheerio.load(data);
    
    const results = $('div.bge').map((i, el) => {
      const listItem = $(el);
      return {
        title: listItem.find('div.kan h3').text().trim(),
        thumbnailUrl: normalizeUrl(listItem.find('img').attr('src') || ''),
        detailUrl: normalizeUrl(listItem.find('a').attr('href') || ''),
        type: listItem.find('div.tpe1_inf b').text().trim(),
        latestChapter: listItem.find('div.new1').eq(1).find('span').eq(1).text().trim(),
        concept: listItem.find('div.tpe1_inf').clone().find('b').remove().end().text().trim(),
        shortDescription: listItem.find('div.kan p').text().trim(),
        additionalInfo: listItem.find('span.judul2').text().trim()
      };
    }).get();
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Detail Komik
app.get('/api/detail', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL diperlukan' });
    
    const response = await fetch(url, { headers });
    const data = await response.text();
    const $ = cheerio.load(data, { xmlMode: true, decodeEntities: false });
    
    const tableInfo = $('table.inftable tr').map((_i, el) => {
      const row = $(el).find('td');
      return {
        key: row.eq(0).text().trim(),
        value: row.eq(1).text().trim()
      };
    }).get();
    
    const getInfo = (key) => tableInfo.find(item => item.key === key)?.value || 'Data tidak tersedia';
    
    const detail = {
      title: getInfo('Judul Komik'),
      indonesianTitle: getInfo('Judul Indonesia'),
      type: getInfo('Jenis Komik'),
      author: getInfo('Pengarang'),
      status: getInfo('Status'),
      minAge: getInfo('Umur Pembaca'),
      concept: getInfo('Konsep Cerita'),
      readingDirection: getInfo('Cara Baca'),
      headerImageUrl: data.match(/url\((.*?)\)/)?.[1] || '',
      thumbnailUrl: $('img[itemprop="image"]').attr('src') || '',
      genres: $('ul.genre > li').map((_i, el) => $(el).text().trim()).get(),
      synopsis: $('section#Sinopsis > p').text().trim(),
      chapters: $('table#Daftar_Chapter tr:has(td)').map((_i, el) => {
        const td = $(el);
        const judulseries = td.find('.judulseries');
        return {
          chapter: judulseries.text().trim(),
          chapterUrl: normalizeUrl(judulseries.find('a').attr('href') || ''),
          releaseDate: td.find('.tanggalseries').text().trim(),
          views: td.find('.pembaca > i').text().trim()
        };
      }).get()
    };
    
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Baca Chapter
app.get('/api/read', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL diperlukan' });
    
    const response = await fetch(url, { headers });
    const data = await response.text();
    const $ = cheerio.load(data, { xmlMode: true, decodeEntities: false });
    
    // Ekstrak thumbnail
    let thumbnailUrl = data.split("data[5] = '")[1]?.split("'")[0];
    if (!thumbnailUrl) {
      const coverUrl = data.split('const data = [')[1]?.split('];')[0]
        ?.split(',')
        .filter(a => a.trim() !== '')
        .at(-1)
        ?.trim()
        ?.replace(/['"]/g, '');
      thumbnailUrl = coverUrl || data.split('thumbnail: "')[1]?.split('"')[0]?.replace(/\\/g, '') || '';
    }
    
    const readingData = {
      title: $('header > h1').text().trim() || 'Data tidak tersedia',
      chapter: $('div[data-chapter-title]').attr('data-chapter-title')?.trim() || 'Data tidak tersedia',
      thumbnailUrl: thumbnailUrl,
      releaseDate: $('time[property="datePublished"]').text().trim() || 'Data tidak tersedia',
      comicImages: $('div#Baca_Komik img').map((_i, el) => $(el).attr('src')).get(),
      nextChapter: normalizeUrl($('svg[data-icon="caret-right"]').parent().attr('href') || '') || undefined,
      prevChapter: normalizeUrl($('svg[data-icon="caret-left"]').parent().attr('href') || '') || undefined
    };
    
    res.json(readingData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Pencarian
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query diperlukan' });
    
    const response = await fetch(`${API_URL}/?post_type=manga&s=${encodeURIComponent(query)}`, { headers });
    const data = await response.text();
    const $ = cheerio.load(data);
    
    const results = $('div.bge').map((i, el) => {
      const listItem = $(el);
      return {
        title: listItem.find('div.kan h3').text().trim(),
        thumbnailUrl: normalizeUrl(listItem.find('img').attr('src') || ''),
        detailUrl: normalizeUrl(listItem.find('a').attr('href') || ''),
        type: listItem.find('div.tpe1_inf b').text().trim(),
        latestChapter: listItem.find('div.new1').eq(1).find('span').eq(1).text().trim(),
        concept: listItem.find('div.tpe1_inf').clone().find('b').remove().end().text().trim(),
        additionalInfo: listItem.find('div.kan p').text().trim()
      };
    }).get();
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Kibo API berjalan di http://localhost:${PORT}`);
});