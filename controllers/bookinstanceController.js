var BookInstance = require('../models/bookinstance');
const Book = require('../models/book');

const async = require('async');
const { body, validationResult } = require('express-validator');
const book = require('../models/book');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
  BookInstance.find()
  .populate('book')
  .exec((err, list_bookinstances) => {
    if (err) {
      return next(err);
    }
    res.render(
      'bookinstance_list',
      {
        title: 'Book Instance List',
        bookinstance_list: list_bookinstances,
      }
    )
  })
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
  BookInstance.findById(req.params.id)
  .populate('book')
  .exec((err, bookinstance) => {
    if (err) {
      return next(err);
    }
    if (bookinstance == null) {
      const err = new Error('Book instance not found');
      err.status = 404;
    }
    res.render(
      'bookinstance_detail',
      {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance: bookinstance
      }
    )
  });

};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
  // get all the books
  Book.find({}, 'title')
    .exec((err, books) => {
      if (err) { return next(err) }
      res.render(
        'bookinstance_form',
        {
          title: 'Create BookInstance',
          book_list: books,
        }
      );
    }
  );
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // validate / sanitize
  body('book', 'Book must be specified')
    .trim().isLength({min:1}).escape(),
  body('imprint', 'Imprint must be specified')
    .trim().isLength({min:1}).escape(),
  body('status').escape(),
  body('due_back', 'Invalid date').optional({checkFalsy: true}).isISO8601().toDate(),

  // process request
  (req, res, next) => {
    const errors = validationResult(req);

    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back
    });

    // ERRORS
    if (!errors.isEmpty()) {
      // find the books again
      Book.find({}, 'title')
        .exec((err, books) => {
          if (err) {return next(err)}
          res.render(
            'bookinstance_form',
            {
              title: 'Create BookInstance',
              book_list: books,
              selected_book: bookinstance.book._id,
              errors: errors.array(),
              bookinstance: bookinstance
            }
          );
        }
      );
      return;
    } else {
      bookinstance.save((err) => {
        if (err) { return next(err) }
        res.redirect(bookinstance.url);
      });
    }
  }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
  BookInstance.findById(req.params.id).populate('book').exec((err, bookinstance) => {
    if (err) { return next(err); }
    if (bookinstance === null) {
      res.redirect('/catalog/bookinstances');
    }

    res.render(
      'bookinstance_delete',
      {
        title: 'Delete copy',
        bookinstance: bookinstance,
      }
    );
  });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
  BookInstance.findById(req.params.id).exec(
    (err, bookinstance) => {
      if (err) { return next(err); }

      BookInstance.findByIdAndRemove(
        req.params.id,
        (err) => {
          if (err) { return next(err); }
          res.redirect(`/catalog/book/${bookinstance.book}`);
        }
      );
    }
  )  
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res) {
  res.send('NOT IMPLEMENTED: BookInstance update GET');
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = function(req, res) {
  res.send('NOT IMPLEMENTED: BookInstance update POST');
};
