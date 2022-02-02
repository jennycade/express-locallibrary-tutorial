const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

const async = require('async');
const { body, validationResult } = require('express-validator');

// /catalogs index page
exports.index = function(req, res) {
  async.parallel(
    {
      book_count: (callback) => {
        Book.countDocuments({}, callback);
      },
      book_instance_count: (callback) => {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count: (callback) => {
        BookInstance.countDocuments({status:'Available'}, callback);
      },
      author_count: (callback) => {
        Author.countDocuments({}, callback);
      },
      genre_count: (callback) => {
        Genre.countDocuments({}, callback);
      },
    },
    (err, results) => {
      res.render('index', {
        title: 'Local Library Home',
        error: err,
        data: results
      });
    }
  )
};

// Display list of all books.
exports.book_list = function(req, res, next) {
  Book.find({}, 'title author')  // return only title and author
    .sort({title : 1})           // sort by title
    .populate('author')          // get author info from _id
    .exec((err, list_books) => {
      if (err) {
        return next(err);
      }
      res.render(                // render book_list.pug
        'book_list',
        {
          title: 'Book List',
          book_list: list_books,
        }
      )
    });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
  async.parallel(
    {
      book: (callback) => {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
      },
      book_instance: (callback) => {
        BookInstance.find({'book': req.params.id})
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        const err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }
      res.render(
        'book_detail',
        {
          title: results.book.title,
          book: results.book,
          book_instances: results.book_instance,
        }
      );
    }
  );
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
  // get all authors and genres
  async.parallel(
    {
      authors: (callback) => {
        Author.find(callback);
      },
      genres: (callback) => {
        Genre.find(callback);
      },
    },

    (err, results) => {
      if (err) { return next(err); }
      res.render(
        'book_form',
        {
          title: 'Create Book',
          authors: results.authors,
          genres: results.genres,
        }
      );
    }
  );
};

// Handle book create on POST.
exports.book_create_post = [

  // convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // validate and sanitize fiels
  body('title', 'Title must not be empty.')
    .trim().isLength({min: 1}).escape(),
  body('author', 'Author must not be empty.')
    .trim().isLength({min: 1}).escape(),
  body('summary', 'Summary must not be empty.')
    .trim().isLength({min: 1}).escape(),
  body('isbn')
    .trim().isLength({min: 1}).escape().withMessage('ISBN required')
    .isISBN().withMessage('ISBN is invalid'),
  body('genre.*').escape(),

  // process request
  (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // get authors and genres for form (again)
      async.parallel(
        {
          authors: (callback) => {
            Author.find(callback);
          },
          genres: (callback) => {
            Genre.find(callback);
          },
        },

        (err, results) => {
          if (err) { return next(err) }

          // mark selected genres as checked
          for (let i=0; i<results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genres[i].checked = 'true';
            }
          }

          res.render(
            'book_form',
            {
              title: 'Create Book',
              authors: results.authors,
              genres: results.genres,
              book: book,
              errors: errors.array(),
            }
          );
          return;
        }
      )
    } else {
      // valid form, save book
      book.save((err) => {
        if (err) { return next(err) }
        res.redirect(book.url);
      });
    }
  }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Book delete GET');
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Book delete POST');
};

// Display book update form on GET.
exports.book_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Book update GET');
};

// Handle book update on POST.
exports.book_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Book update POST');
};
