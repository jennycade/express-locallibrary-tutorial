const async = require('async');
const { body, validationResult } = require('express-validator');

let Author = require('../models/author');
const Book = require('../models/book');

// Display list of all Authors
exports.author_list = (req, res, next) => {
  Author.find()
  .sort([['family_name', 'ascending']])
  .exec((err, list_authors) => {
    if (err) {
      return next(err);
    }
    res.render(
      'author_list',
      {
        title: 'Author list',
        author_list: list_authors
      }
    );
  });
}

// Display detail page for a specific Author.
exports.author_detail = function(req, res, next) {
  async.parallel(
    {
      author: (callback) => {
        Author.findById(req.params.id)
          .exec(callback);
      },
      authors_books: (callback) => {
        Book.find({'author': req.params.id}, 'title summary')
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.author == null) {
        const err = new Error('Author not found');
        err.status = 404;
        return next(err);
      }
      res.render(
        'author_detail',
        {
          title: `Author Detail for ${results.author.name}`,
          author: results.author,
          author_books: results.authors_books
        }
      );
    }
  );
};

// Display Author create form on GET.
exports.author_create_get = function(req, res) {
  res.render(
    'author_form',
    {title: 'Create Author'}
  );
};

// Handle Author create on POST.
exports.author_create_post = [
  // validate and sanitize form data
  
  // first_name
  body('first_name')
    .trim()
    .isLength({ min: 1})
    .escape()
    .withMessage('First name required.'),
  
  // family_name
  body('family_name')
    .trim()
    .isLength({ min: 1})
    .escape()
    .withMessage('Family name required.'),
  
  // date_of_birth
  body('date_of_birth', 'Invalid date of birth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  
  // date_of_death
  body('date_of_death', 'Invalid date of death')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // process requrest after validation/sanitation
  (req, res, next) => {
    const errors = validationResult(req);

    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
    });

    if (!errors.isEmpty()) {
      // re-render with errors and values
      res.render(
        'author_form',
        {
          title: 'Create Author',
          author: author,
          errors: errors.array(),
        }
      );
      return;
    } else {
      // no form errors
      // author already exists?
      Author.findOne({
        'first_name': req.body.first_name,
        'family_name': req.body.family_name
      })
      .exec((err, found_author) => {
        if (err) { return next(err); }
        if (found_author) {
          // matching author name already exists - redirect
          res.redirect(found_author.url);
        } else {
          // author doesn't alreaady exist
          author.save((err) => {
            if (err) {
              return next(err);
            }
            // saved, now redirect
            res.redirect(author.url);
          });
        }
      });
    }
  }
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
  async.parallel(
    {
      author: (callback) => {
        Author.findById(req.params.id).exec(callback);
      },

      authors_books: (callback) => {
        Book.find({'author': req.params.id }).exec(callback);
      },
    },

    (err, results) => {
      if (err) { return next(err); }
      if (results.author === null) {
        res.redirect('/catalog/authors');
      }

      res.render(
        'author_delete',
        {
          title: 'Delete Author',
          author: results.author,
          author_books: results.authors_books,
        }
      );
    }
  );
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res,next) {
  
  async.parallel(
    {
      author: (callback) => {
        Author.findById(req.body.authorid).exec(callback);
      },
      authors_books: (callback) => {
        Book.find({author: req.body.authorid}).exec(callback);
      }
    },

    (err, results) => {
      if (err) { return next(err) }
      if (results.authors_books.length > 0) {
        // Author has books. render as GET
        res.render('author_delete',
          {
            title: 'Delete Author',
            author: results.author,
            author_books: results.authors_books,
          }
        );
        return;
      } else {
        // no books, delete author
        Author.findByIdAndRemove(
          req.body.authorid,
          (err) => {
            if (err) { return next(err); }
            res.redirect('/catalog/authors');
          }
        );
      }
    }
  );
};

// Display Author update form on GET.
exports.author_update_get = function(req, res, next) {
  Author.findById(req.params.id,
    (err, author) => {
      if (err) { return next(err); }
      if (author === null) {
        const error = new Error('Author not found.');
        error.status = 404;
        return next(error);
      }

      res.render(
        'author_form',
        {
          title: 'Update author',
          author: author,
        }
      );
    }
  );
};

// Handle Author update on POST.
exports.author_update_post = [
  // validate and sanitize form data
  
  // first_name
  body('first_name')
    .trim()
    .isLength({ min: 1})
    .escape()
    .withMessage('First name required.'),
  
  // family_name
  body('family_name')
    .trim()
    .isLength({ min: 1})
    .escape()
    .withMessage('Family name required.'),
  
  // date_of_birth
  body('date_of_birth', 'Invalid date of birth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  
  // date_of_death
  body('date_of_death', 'Invalid date of death')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // process requrest after validation/sanitation
  (req, res, next) => {
    const errors = validationResult(req);

    const author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // re-render with errors and values
      res.render(
        'author_form',
        {
          title: 'Update Author',
          author: author,
          errors: errors.array(),
        }
      );
      return;
    } else {
      // no form errors
      Author.findByIdAndUpdate(
        req.params.id,
        author,
        {},
        (err, updated_author) => {
          if (err) { return next(err); }
          res.redirect(updated_author.url);
        }
      );
    }
  }
];