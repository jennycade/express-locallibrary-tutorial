const async = require('async');
const { body, validationResult } = require('express-validator');

var Genre = require('../models/genre');
const Book = require('../models/book');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
  Genre.find()
    .sort('name')
    .exec((err, genre_list) => {
      if (err) {
        return next(err);
      }
      res.render(
        'genre_list',
        {
          title: 'Genre List',
          genre_list: genre_list
        }
      )
    })
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {

  async.parallel(
    {
      genre: (callback) => {
        Genre.findById(req.params.id)
          .exec(callback);
      },

      genre_books: (callback) => {
        Book.find({'genre': req.params.id})
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err)
      }
      if (results.genre == null) {
        const err = new Error('Genre not found');
        err.status = 404;
        return next(err);
      }
      res.render(
        'genre_detail',
        {
          title: 'Genre Detail',
          genre: results.genre,
          genre_books: results.genre_books,
        }
      );
    }
  );
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
  res.render('genre_form', {title: 'Create Genre'});
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name required')
    .trim()
    .isLength({ min: 1})
    .escape(),
  
  // process request after validation/sanitization
  (req, res, next) => {
    // extract the validation errors from a request
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre( { name: req.body.name });

    if (!errors.isEmpty()) {
      // errors -> re-render form with sanitized values and error messages.
      res.render(
        'genre_form',
        {
          title: 'Create Genre',
          genre: genre,
          errors: errors.array(),
        }
      );
      return;
    } else {
      // wooo no errors in the form data
      // check if genre with same name already exists
      Genre.findOne({'name': req.body.name})
      .exec ((err, found_genre) => {
        if (err) {
          return next(err);
        }
        if (found_genre) {
          // Genre already exists. Redirect.
          res.redirect(found_genre.url);
        } else {
          // not found, save new one
          genre.save((err) => {
            if (err) {
              return next(err);
            }
            // saved, now redirect
            res.redirect(genre.url);
          });
        }
      });
    }
  }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre delete GET');
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre delete POST');
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre update GET');
};

// Handle Genre update on POST.
exports.genre_update_post = function(req, res) {
  res.send('NOT IMPLEMENTED: Genre update POST');
};
