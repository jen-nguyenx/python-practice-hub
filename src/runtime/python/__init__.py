"""PyLadder grading package (_pl).

Loaded into Pyodide as the private package ``_pl`` (files written to <root>/_pl/*.py and <root> added
to sys.path). Student code cannot import it. Public entry points live in ``_pl.harness`` and return JSON
strings that match src/runtime/protocol.ts.
"""
