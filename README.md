# Local History for Atom

Atom package for maintaining a local history of files (history of your changes to the code files).


## Why?

For maintaining a history of the files revisions like mostly code editors:
  * ["Local History" of Eclipse IDE](http://help.eclipse.org/juno/index.jsp?topic=%2Forg.eclipse.platform.doc.user%2Freference%2Fref-6a.htm)
  * [The plugin "Local History" for SublimeText](https://github.com/vishr/local-history)
  * IntelliJ and other...

> Especially, I need an automated backup of my work to save me from stupid accidents... :fist:


## Benefits

  * Local history of a file is maintained when you create or edit a file.
    Each time you save a file, a copy of the old contents is kept in the local history.
  * It can help you out when you change or delete a file by accident.
  * It saves your work when you forget to commit or push your code.
  * The history can also help you out when your workspace has a catastrophic problem
    or if you get disk errors that corrupt your workspace files.
  * Each file revision is stored in a separate file (with full path) inside the `.atom/local-history` directory of your home directory.
    e.g: `/home/nicolas/.atom/local-history/var/www/my-great-project/lib/2014-06-21_17-05-43_utils.js`
  * Show diff and merge with your favorite diff tool.


## Install

```sh
apm install local-history
```
Or Settings ➔ Packages ➔ Search for `local-history`

## Usage

Show the history of the current file:

  * From the context menu (right click)

![Contextual menu](http://i.imgur.com/HNeP768.png)


  * Or with the command

![Commands](http://i.imgur.com/3UAfYHo.png)


Then, select the revision to open in another tab

![Revisions list](http://i.imgur.com/x14qm5n.png)


### command

  * `local-history:current-file` show local history of current file.
  * `local-history:difftool-current-file` Open the current file and a given revision file with your defined diff tool (see [difftoolCommand](#difftoolcommand)).
  * `local-history:purge` purge the expired revisions (see [daysLimit](#dayslimit)).


## Settings

### historyStoragePath

Path where the revision files are stored.  
By default in your Atom (home) directory : _.atom/local-history_.

### AutoPurge

Automatic purge (triggered, max 1 time per day).

Disabled by default.
You must check to enable this option.

### fileSizeLimit

File size limit, by default: 262144 (256 KB).
The files heavier than the defined size will not be saved.


### daysLimit

Days retention limit, by default: 30 days by file.
The oldest files are deleted when purging (local-history:purge).


### difftoolCommand

A custom command to open your favorite diff tool, by default: [meld](http://meldmerge.org).

Example:

```sh
meld "{current-file}" "{revision-file}"
```
  * `{current-file}` is the placeholder replaced automatically by the path of the current file.
  * `{revision-file}` is the placeholder replaced automatically by the path of the revision file selected.

The actual command generated will be something like this:
```sh
meld "/var/www/my-project/my-current-file.js" "/home/nicolas/.atom/local-history/var/www/my-project/2014-07-08_19-32-00_my-current-file.js"
```

### difftoolCommandShowErrorMessage

Show the errors of the diff tool command.
If checked, the errors are displayed in a message panel.

Enabled by default.


## LICENSE

[MIT](https://github.com/Nicolab/atom-local-history/blob/master/LICENSE.md) (c) 2013, Nicolas Tallefourtane.


## Author

| [![Nicolas Tallefourtane - Nicolab.net](http://www.gravatar.com/avatar/d7dd0f4769f3aa48a3ecb308f0b457fc?s=64)](http://nicolab.net) |
|---|
| [Nicolas Talle](http://nicolab.net) |
| [![Make a donation via Paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=PGRH4ZXP36GUC) |
