const express = require('express');
const mongoose = require('mongoose');
const { Client } = require('@elastic/elasticsearch');

const app = express();
app.use(express.json());

// MongoDB setup
const mongoUri = 'mongodb://mongo:27017/mydb';
mongoose.connect(mongoUri);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Elasticsearch setup
const esClient = new Client({ node: 'http://elasticsearch:9200' });

// Define schemas and models
const articleSchema = new mongoose.Schema({
  title: String,
  content: String
});
const Article = mongoose.model('Article', articleSchema);

// API endpoints
app.post('/articles', async (req, res) => {
  const { title, content } = req.body;
  try {
    const article = new Article({ title, content });
    await article.save();
    await esClient.index({
      index: 'articles',
      id: article._id.toString(),
      body: {
        title,
        content
      }
    });
    res.status(201).send(article);
  } catch (error) {
    res.status(500).send({ message: 'Error saving article or indexing in Elasticsearch', error });
  }
});

app.get('/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).send({ message: 'Query parameter is required' });
  }
  try {
    const { body } = await esClient.search({
      index: 'articles',
      body: {
        query: {
          multi_match: {
            query,
            fields: ['title', 'content']
          }
        }
      }
    });
    res.send(body);
  } catch (error) {
    res.status(500).send({ message: 'Error searching in Elasticsearch', error });
  }
});

app.listen(3100, () => {
  console.log('Server is running on port 3100');
});
