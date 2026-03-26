const articleService = require('../services/articleService');

class ArticleController {
  async getAll(req, res, next) {
    try {
      const { search, category, active } = req.query;
      let articles;
      if (search) {
        articles = articleService.searchArticles(search);
      } else if (category) {
        articles = articleService.getAllArticles(a => a.category === category);
      } else if (active === 'true') {
        articles = articleService.getAllArticles(a => a.active !== false);
      } else {
        articles = articleService.getAllArticles();
      }
      res.json({ success: true, count: articles.length, data: articles });
    } catch (err) { next(err); }
  }

  async getById(req, res) {
    try {
      const article = articleService.getArticleById(req.params.id);
      res.json({ success: true, data: article });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  async create(req, res) {
    try {
      const article = articleService.createArticle(req.body);
      res.status(201).json({ success: true, data: article });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const article = articleService.updateArticle(req.params.id, req.body);
      res.json({ success: true, data: article });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const result = articleService.deleteArticle(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }
}

module.exports = new ArticleController();
