const router = require("express").Router();
const Product = require("../models/products");
const Review = require("../models/reviews");

// GET all products (nine per page)
router.get("/", (req, res, next) => {
  const perPage = 9;
  const { page } = req.query || 1;
  const { category, query, price } = req.query;

  const sortBy = {
    highest: { price: -1 },
    lowest: { price: 1 }
  }

  const filter = {
    ...category ? { category: { '$regex': `^${category}$`, '$options': 'i' } } : {},
    ...query ? { name: { '$regex': query, '$options': 'i' } } : {}
  };

  Product.find(filter)
    .skip(perPage * page - perPage)
    .limit(perPage)
    .sort(sortBy[price] || {})
    .exec((err, products) => {
      Product.countDocuments(filter).exec((err, count) => {
        if (err) return next(err);
        return products ? res.send({count, products}) : res.status(404).end()
      });
    });
});

// POST new product
router.post("/", (req, res, next) => {
  const product = new Product(
    {
      category: req.body.category,
      name: req.body.name,
      price: req.body.price,
      image: "https://via.placeholder.com/250?text=Product+Image",
      reviews: []
    }
  );

  product.save((err) => {
    if (err) return next(err);
  });

  res.send(product);
});

// GET a given product by ID
router.get("/:productId", (req, res, next) => {
  Product.findById(req.params.productId)
    .exec((err, product) => {
      if (err) return next(err);
      return product ? res.send(product) : res.status(404).end()
    });
});

// GET reviews for a given product by ID (four per page)
router.get("/:productId/reviews", (req, res, next) => {
  const perPage = 4;
  const { page } = req.query || 1;
  
  Review.find({ product: req.params.productId })
    .skip(perPage * page - perPage)
    .limit(perPage)
    .exec((err, review) => {
      if (err) return next(err);

      Product.findById(req.params.productId)
        .exec((err, product) => {
          if (err) return next(err);
          return product ? res.send(review) : res.status(404).end()
        });
    });
});

// POST review for a given product by ID
router.post("/:productId/reviews", (req, res, next) => {
  const review = new Review(
    {
      userName: req.body.userName,
      text: req.body.text,
      product: req.params.productId
    }
  );

  Product.findById(req.params.productId)
    .exec((err, product) => {
      if (err) return next(err);

      if (product) {
        review.save((err) => {
          if (err) return next(err);
        });

        product.reviews.push(review)
        product.save()

        res.send(product)
      } else {
        res.status(404).end()
      }
    });
});

// DELETE a given product by ID
router.delete("/:productId", (req, res, next) => {
  Product.findByIdAndDelete(req.params.productId)
  .exec((err, product) => {
    if (err) return next(err);

    if (product) {
      Review.deleteMany({ product: req.params.productId })
      .exec((err, result) => {
        if (err) return next(err);
        return result ? res.status(204).send() : res.status(404).end()
      })
    } else {
      res.status(404).end()
    }
  });
});

module.exports = router;