# Crisp - A fresh & crunchy JavaScript Lisp.

## Building

The compiler source lives in `src/`. Crisp compiles itself, using a
previous version of the compiler in `previous/`, to `lib`.

To compile and test, call `grunt default` (or just `grunt`). To
approve a build - and thus make it the code you will use to build the
next version, call `grunt approve`.
