# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A collection has dates around it: the day of the mint, the day of a reveal, the day a page of a standard was written, the
day a release of this tool was made. None of them changes what is wrong in a folder of metadata. A tool that read the
clock, or printed the day of the run, would make the same folder give a different report on a different day, so the saved
output of the examples could never be compared with a new run, and two people reading the same commit could see two
reports. A date in a document of the repository goes stale on its own and says nothing about the checks.

The order of the files can move a report too: a listing of a folder comes back in an order that differs between systems,
and a sort that follows the locale of the machine differs between machines.

## Decision

1. The tool reads no clock, no time zone and no locale. It never prints the current time and never says when a page, a
   standard or a release was published. The same folder gives the same output on every machine and on every day.
2. The files of a folder are read in the order of their names by their code units, never by the order of the listing or
   by the locale; numbers in the reports are grouped with the locale fixed in the call.
3. No document, example or test of this repository holds a date or a number that reads like a year: not the licence,
   not the changelog, not the documents, not the comments of the code, not the examples. `npm run check` and a test fail
   on any word of four digits that starts with 19 or 20. The saved copies of the public pages under research/sources are
   the pages' own words and are the one place the check does not read for prose; even so, the lines that carry a date or
   a number that reads like a year (the day an ERC page was created, the year of an event and of a list of
   implementations in ERC-721, the year in the footer of the Metaplex page) were left out of the copies, so the test that
   reads every file for a year passes over them too. research/sources.md lists every line that was left out.
4. A version, an id or the number of a standard is not a year and is not caught: 1.0.0, Node 22, ERC-721, ERC-1155,
   SARIF 2.1.0, NIST SP 800-218 and a token id of 64 hex digits hold no year. The examples use ids, sizes and values
   that do not read like a year, and a test of test/repo.test.js runs the pattern over such values and checks that none
   of them is caught, and that a year in the same place still is.
5. The sources are chosen with addresses that hold no year, and the notes on them name no publication date.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar or the machine.
- The report holds no date and no deadline; a team that needs one keeps it next to the report.
- An example whose sizes change can trip the year check; the example is then changed, not the check.
