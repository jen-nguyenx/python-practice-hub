# PyLadder's R harness. The content verifier (webR in Node) and the browser sandbox (webR in an
# opaque-origin iframe) load this same file, so a lesson's recorded output and a student's own run come
# from the same R doing the same thing.
#
# Code runs through R's real console, one top-level expression at a time (src/runtime/r/driver.ts), so
# what is recorded is what R itself printed: its own autoprint, warnings and error messages. This file
# only supplies what the console cannot: splitting code into expressions, marking where an error began,
# resetting between runs, and turning values into JSON for pictures and tests.
#
# Everything lives in one environment attached to the search path, so clearing the global environment
# between runs leaves the harness in place.
local({
  pl <- new.env()

  # Plots are drawn by the app from values R produced, never by an R graphics device: a device would
  # need a canvas the verifier does not have, and a picture only the browser could draw is one the
  # verifier cannot check.
  options(device = function(...) grDevices::pdf(NULL))
  pl$.pl_options <- options()

  # Written to stderr by a global calling handler the moment an error is signalled, before R prints it.
  # Everything after the mark is R's own error report; the driver strips the mark itself.
  pl$.pl_mark <- function(cond) cat("\001PLERR\001\n", file = stderr())

  pl$.pl_str <- function(s) {
    s <- enc2utf8(as.character(s))
    s <- gsub("\\", "\\\\", s, fixed = TRUE)
    s <- gsub("\"", "\\\"", s, fixed = TRUE)
    s <- gsub("\n", "\\n", s, fixed = TRUE)
    s <- gsub("\r", "\\r", s, fixed = TRUE)
    s <- gsub("\t", "\\t", s, fixed = TRUE)
    ctl <- grepl("[\001-\037]", s)
    if (any(ctl)) {
      s[ctl] <- vapply(s[ctl], function(x) {
        ch <- strsplit(x, "")[[1]]
        bad <- grepl("[\001-\037]", ch)
        ch[bad] <- sprintf("\\u%04x", vapply(ch[bad], utf8ToInt, 0L))
        paste(ch, collapse = "")
      }, "", USE.NAMES = FALSE)
    }
    paste0("\"", s, "\"")
  }

  # R has no scalars, so a length-1 vector becomes a plain value and anything longer an array; wrap a
  # value in as.list() to force an array. A matrix or data frame becomes one array per row, which is the
  # [x, y] pairs a plot draws. Non-finite numbers become null, which the verifier then refuses to draw.
  pl$.pl_json <- function(x, scalar = TRUE) {
    if (is.null(x)) return("null")
    if (is.factor(x)) x <- as.character(x)
    if (is.data.frame(x)) {
      x[] <- lapply(x, function(col) if (is.factor(col)) as.character(col) else col)
      rows <- vapply(seq_len(nrow(x)), function(i) .pl_json(unname(lapply(x, `[[`, i)), FALSE), "")
      return(paste0("[", paste(rows, collapse = ","), "]"))
    }
    if (is.matrix(x)) {
      rows <- vapply(seq_len(nrow(x)), function(i) .pl_json(unname(x[i, ]), FALSE), "")
      return(paste0("[", paste(rows, collapse = ","), "]"))
    }
    if (is.list(x)) {
      parts <- vapply(x, .pl_json, "", USE.NAMES = FALSE)
      n <- names(x)
      if (!is.null(n) && length(n) > 0 && all(nzchar(n))) {
        return(paste0("{", paste0(.pl_str(n), ":", parts, collapse = ","), "}"))
      }
      return(paste0("[", paste(parts, collapse = ","), "]"))
    }
    if (is.atomic(x)) {
      vals <- if (is.logical(x)) {
        ifelse(is.na(x), "null", ifelse(x, "true", "false"))
      } else if (is.numeric(x)) {
        v <- as.double(x)
        ifelse(is.finite(v), sprintf("%.15g", v), "null")
      } else if (is.character(x)) {
        ifelse(is.na(x), "null", .pl_str(x))
      } else {
        .pl_str(as.character(x))
      }
      if (scalar && length(x) == 1) return(vals)
      return(paste0("[", paste(vals, collapse = ","), "]"))
    }
    .pl_str(paste(format(x), collapse = " "))
  }

  # The top-level expressions of a program, each with its own source text and first line, as JSON.
  pl$.pl_split <- function(code) {
    exprs <- tryCatch(parse(text = code, keep.source = TRUE), error = function(e) e)
    if (inherits(exprs, "error")) {
      return(paste0("{\"ok\":false,\"message\":", .pl_str(conditionMessage(exprs)), "}"))
    }
    refs <- attr(exprs, "srcref")
    items <- vapply(seq_along(exprs), function(i) {
      r <- refs[[i]]
      paste0("{\"src\":", .pl_str(paste(as.character(r), collapse = "\n")), ",\"line\":", r[1], "}")
    }, "")
    paste0("{\"ok\":true,\"exprs\":[", paste(items, collapse = ","), "]}")
  }

  # Every run starts from the same place: an empty workspace, nothing attached that R did not start with,
  # the options R started with, and the same random numbers, so a lesson that calls rnorm() records the
  # same output on every verify. Detaching matters as much as clearing: a block that forgot library(MASS)
  # must fail, not quietly borrow the one an earlier block attached.
  pl$.pl_reset <- function() {
    for (p in setdiff(search(), pl$.pl_search)) {
      if (startsWith(p, "package:")) try(detach(p, character.only = TRUE), silent = TRUE)
    }
    rm(list = ls(envir = globalenv(), all.names = TRUE), envir = globalenv())
    suppressWarnings(options(pl$.pl_options))
    grDevices::graphics.off()
    set.seed(2402)
    invisible("ok")
  }

  # One expression evaluated in the workspace a program left behind, for a picture to draw from.
  pl$.pl_probe <- function(expr) {
    tryCatch({
      value <- suppressWarnings(eval(parse(text = expr, keep.source = FALSE), globalenv()))
      paste0("{\"ok\":true,\"value\":", .pl_json(value), "}")
    }, error = function(e) paste0("{\"ok\":false,\"message\":", .pl_str(conditionMessage(e)), "}"))
  }

  # Numbers within `tol` of the value wanted, relative to it: |got - want| <= tol * |want|, plus 1e-12 so an
  # expected zero allows rounding noise. Not all.equal's rule, which turns absolute whenever the expected
  # value is smaller than tol -- and would then pass 0 for a p-value of 1e-7. Names are ignored; anything
  # that is not a plain numeric vector falls back to all.equal.
  pl$.pl_close <- function(got, want, tol) {
    if (is.numeric(got) && is.numeric(want) && !is.list(got) && !is.list(want)) {
      g <- as.double(got)
      w <- as.double(want)
      if (length(g) != length(w)) return(FALSE)
      ok <- (is.na(g) & is.na(w)) |
        (!is.na(g) & !is.na(w) & (g == w | abs(g - w) <= tol * abs(w) + 1e-12))
      return(all(ok))
    }
    isTRUE(all.equal(want, got, tolerance = tol, check.attributes = FALSE))
  }

  # One test of a task: run `setup` and `call` in a scratch environment on top of the student's
  # workspace, evaluate `expect` on its own, and compare. Names and attributes are ignored, so a named
  # vector matches the plain numbers it holds; "float" allows `tol` of relative difference (.pl_close).
  pl$.pl_test <- function(setup, call, expect, cmp, tol) {
    show <- function(v) paste(utils::capture.output(print(v)), collapse = "\n")
    tryCatch({
      env <- new.env(parent = globalenv())
      if (nzchar(setup)) eval(parse(text = setup, keep.source = FALSE), env)
      got <- eval(parse(text = call, keep.source = FALSE), env)
      want <- eval(parse(text = expect, keep.source = FALSE), new.env(parent = globalenv()))
      ok <- if (identical(cmp, "float")) .pl_close(got, want, tol) else
        isTRUE(all.equal(want, got, tolerance = 0, check.attributes = FALSE))
      paste0("{\"pass\":", if (ok) "true" else "false", ",\"got\":", .pl_str(show(got)),
             ",\"want\":", .pl_str(show(want)), "}")
    }, error = function(e) paste0("{\"pass\":false,\"error\":", .pl_str(conditionMessage(e)), "}"))
  }

  # A pinned package file written by the driver (src/runtime/r/packages.ts), unpacked into R's library.
  # A webR package file is the installed package folder itself, so unpacking is installing.
  pl$.pl_install <- function(path) {
    utils::untar(path, exdir = .libPaths()[1], tar = "internal")
    unlink(path)
    "ok"
  }

  # Which of `pkgs` exports `name`, or "": for telling an author which library() call a block is missing.
  pl$.pl_exporter <- function(name, pkgs) {
    for (p in pkgs) {
      if (requireNamespace(p, quietly = TRUE) && name %in% getNamespaceExports(p)) return(p)
    }
    ""
  }

  # The lessons' packages arrive through library() on their own; anything else would need a network
  # this R does not have.
  pl$install.packages <- function(pkgs, ...) {
    stop("packages cannot be installed here; library() loads the ones these lessons use", call. = FALSE)
  }

  # There is nobody at this console to answer a prompt, and quitting would take R down with it.
  pl$readline <- function(prompt = "") {
    stop("readline() waits for someone to type at the console, which is not available here", call. = FALSE)
  }
  pl$menu <- function(choices, graphics = FALSE, title = NULL) {
    stop("menu() waits for someone to type at the console, which is not available here", call. = FALSE)
  }
  pl$q <- pl$quit <- function(...) {
    stop("R keeps running here; there is nothing to quit", call. = FALSE)
  }

  for (f in ls(pl, all.names = TRUE)) if (is.function(pl[[f]])) environment(pl[[f]]) <- pl
  attach(pl, name = "tools:pyladder", warn.conflicts = FALSE)
  # The search path as R started it, harness included: what every reset returns to.
  pl$.pl_search <- search()
})
# The value of the file, so loading it can be confirmed.
"ready"
