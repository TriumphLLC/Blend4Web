.. index:: git

.. _git_short_manual:

********************
Team Work. Using Git
********************

.. contents:: Table of Contents
    :depth: 3
    :backlinks: entry

.. _what_is_git:

Overview
========

In order to organize team work a Git version control system can be used. Using Git has a number of benefits as compared with other ways to collaborate:

* saving the history of changes with the possibility to roll back to previous versions
* synchronizing changes between users and automatic merging of changes
* working with large binary files is possible

Git is a distributed system and every developer or designer has his own local repository (storage). Syncing between the local repositories can be performed via the central ("shared") storage, which can be located on a dedicated machine (server). Access to the server can be organized through SSH protocol.

Although there are many GUIs for Git beginners, here the work with the ``git`` standard console utility is explained.


.. _git_pipeline:

Typical Workflow
================

#. Files can be created, added or deleted during the work process in the local repositories.
#. After a certain logical period of work is finished it is necessary to fix (commit) the changes and/or synchronize with your team mates.
#. Files are prepared for commit i.e. the accounting of changed, new and deleted files and also the resetting of changes.
#. Commit is performed.
#. Local changes are uploaded into the shared storage and become available for the colleagues.

A limited set of Git commands recommended for authoring applications and their graphical resources is described below. 

It's necessary to switch to the repository before executing the commands, e.g.:

.. code-block:: bash

    > cd ~/blend4web



.. index:: git; individual settings 

.. _git_config:

Individual Settings
===================

A new user can set up his name and email using the commands:

.. code-block:: none
    
    > git config --global user.name "Ivan Petrov"
    > git config --global user.email ipetrov@blend4web.com


The set up data will be used in the changelog.


.. index:: git; checking the status

.. _git_example_begin:

Checking the Status
===================

It's recommended to check the state of the repository before, in progress and after performing all the operations.

Use this command to check the status:

.. code-block:: none
    
    > git status


The result of the ``git status`` command if all the commits were performed and there are no new files:

.. code-block:: none

    # On branch master 
    # Your branch is ahead of 'origin/master' by 2 commits. 
    # 
    nothing to commit (working directory clean) 

Possible result of ``git status`` if there are changes. For example the :file:`apps_dev/firstperson/firstperson.js` and :file:`doc_src/git_short_manual.rst` files are changed and a new file :file:`123.txt` is created:

.. code-block:: none

    # On branch master
    # Changes not staged for commit:
    #   (use "git add <file>..." to update what will be committed)
    #   (use "git checkout -- <file>..." to discard changes in working directory)
    #
    #	modified:   apps_dev/firstperson/firstperson.js
    #	modified:   doc_src/git_short_manual.rst
    #
    # Untracked files:
    #   (use "git add <file>..." to include in what will be committed)
    #
    #	123.txt
    no changes added to commit (use "git add" and/or "git commit -a")


.. index:: git; preparing for commit

.. _git_example_prepare_to_commit:

Before the Commit
=================

Checking changes (of the text files)
------------------------------------

In case of text files it is recommended to view the introduced changes before performing the commit.

Check what was changed in the whole directory:

.. code-block:: none

    > git diff

or in a specific file only:

.. code-block:: none

    > git diff apps_dev/firstperson/firstperson.js

A possible result of the ``git diff`` command for a text file:

.. code-block:: none

    diff --git a/apps_dev/firstperson/firstperson.js b/apps_dev/firstperson/firstperson.js
    index 4381c99..44b3b15 100644
    --- a/apps_dev/firstperson/firstperson.js
    +++ b/apps_dev/firstperson/firstperson.js
    @@ -557,8 +557,9 @@ function enable_camera_control_mode() {
                 var cam_view_down = CAMERA_MOVE_UPDOWN * (Math.sin(_passed_time) - 1);
     
                 b4w.camera.translate_view(obj, 0, cam_view_down, cam_view_angle);
    -        } else
    +        } else {
                 b4w.camera.translate_view(obj, 0, 0, 0);
    +        }
         }

Rolling back files
------------------

If the file was changed or deleted but it is necessary to recover it (to the latest committed state) use the command:

.. code-block:: none

    > git checkout doc_src/git_short_manual.rst
    > git checkout 123.txt

The introduced changes will be canceled - this is why this command should be performed with caution.


Unwanted files
--------------

If a file is listed in the ``Untracked files`` (``git status``), but version control is not needed for it, it should be deleted or moved beyond the working directory.




.. index:: git; adding and removing files

.. _git_example_add_rm_commit:

Preparing for Commit
====================

Adding files
------------

If you are happy with the changes, add the needed changed and/or new files for commit.

.. code-block:: none

    > git add apps_dev/firstperson/firstperson.js
    > git add 123.txt

Check the status again:

.. code-block:: none
    
    > git status

Possible result of the ``git status`` command after adding some files with the ``git add`` command:

.. code-block:: none

    # On branch master
    # Changes to be committed:
    #   (use "git reset HEAD <file>..." to unstage)
    #
    #	new file:   123.txt
    #	modified:   apps_dev/firstperson/firstperson.js
    #
    # Changes not staged for commit:
    #   (use "git add <file>..." to update what will be committed)
    #   (use "git checkout -- <file>..." to discard changes in working directory)
    #
    #	modified:   doc_src/git_short_manual.rst
    #

You can see that the :file:`apps_dev/firstperson/firstperson.js` and :file:`123.txt` files were added for commit and the :file:`doc_src/git_short_manual.rst` file was not added. To make things easier it is recommended to either add such files for commit or cancel their changes with the ``git checkout`` command.

Removing files
--------------

Some files can be marked as deleted from Git after performing the ``git status`` command, for example:

.. code-block:: none

    # On branch master
    # Your branch is ahead of 'origin/master' by 2 commits.
    #
    # Changes not staged for commit:
    #   (use "git add/rm <file>..." to update what will be committed)
    #   (use "git checkout -- <file>..." to discard changes in working directory)
    #
    #	deleted:    123.txt
    #
    no changes added to commit (use "git add" and/or "git commit -a")

In this case if deleting the file should be recorded (i.e. enter the commit), perform the ``git rm`` command, for example:

.. code-block:: none

    > git rm 123.txt

If the file was deleted by accident and its necessary to recover it, use the ``git checkout`` command.


.. index:: git; commit

.. _git_commit:

Commit
======

Perform commit with the command:

.. code-block:: none

    > git commit

A text editor window will show up (for example, **nano** or **vim**), in which it's necessary to enter the commit comment in English.

.. code-block:: none

      GNU nano 2.2.6                                    File: .git/COMMIT_EDITMSG

    My commit message 
    # Please enter the commit message for your changes. Lines starting
    # with '#' will be ignored, and an empty message aborts the commit.
    # On branch master
    # Changes to be committed:
    #   (use "git reset HEAD <file>..." to unstage)
    #
    #       new file:   123.txt
    #       modified:   apps_dev/firstperson/firstperson.js
    #
    # Changes not staged for commit:
    #   (use "git add <file>..." to update what will be committed)
    #   (use "git checkout -- <file>..." to discard changes in working directory)
    #
    #       modified:   doc_src/git_short_manual.rst
    #

    ^G Get Help               ^O WriteOut               ^R Read File              ^Y Prev Page
    ^X Exit                   ^J Justify                ^W Where Is               ^V Next Page

Save the changes and quit the editor (in **nano** Ctrl+O, then Ctrl+X; in **vim** ZZ, or ESC :wq).

After commit it's recommended to recheck the status. Commit is performed correctly if the ``git status`` command returns ``nothing to commit, working directory clean``.



.. index:: git; synchronization between repositories

.. _git_example_repo_sync:

Syncing Between Repositories
============================

From the remote - to the local
------------------------------

After all the commits are performed it's necessary to load the changes from the remote ("shared") repository to the local one:

.. code-block:: none

    > git pull

Result of the ``git pull`` command if there are no changes in the remote repository:

.. code-block:: none

    Already up-to-date.

Result of the ``git pull`` command if the remote repository contains changes and syncing was successful:

.. code-block:: none

    remote: Counting objects: 151, done. 
    remote: Compressing objects: 100% (101/101), done. 
    remote: Total 102 (delta 74), reused 0 (delta 0) 
    Receiving objects: 100% (102/102), 69.77 MiB | 4.87 MiB/s, done. 
    Resolving deltas: 100% (74/74), completed with 32 local objects. 
    From lixer:blend4web 
       dbf3877..9f9700c  master     -> origin/master 
    Updating dbf3877..9f9700c 
    Fast-forward 
     apps_dev/firstperson/firstperson.js                |  338 +-- 
     .../location_agriculture.blend                     |  Bin 25601626 -> 25598644 bytes 
     ...
     src/controls.js                                    |   38 +- 
     src/data.js                                        |    5 + 
     src/physics.js                                     |  185 +- 
     19 files changed, 1452 insertions(+), 2767 deletions(-) 
     create mode 100644    deploy/assets/location_agriculture/textures/rotonda_02_diff.png 

If you wish it's possible to look up the changes made by your colleagues using the following command:

.. code-block:: none

    > git diff dbf3877..9f9700c

The parameter of this command - in this case dbf3877..9f9700c - shows between which commits exactly the changes were made. This parameter can be conveniently selected in the console in the ``git pull`` results and pasted with a mouse click (middle button) where you need.


You can also view the changelog:

.. code-block:: none

    > git log


The ``git pull`` command does not always lead to a successful synchronization. The result of ``git pull`` when there are conflicts:

.. code-block:: none

    remote: Counting objects: 11, done.
    remote: Compressing objects: 100% (6/6), done.
    remote: Total 6 (delta 5), reused 0 (delta 0)
    Unpacking objects: 100% (6/6), done.
    From lixer:blend4web
       ff715c2..dbf316a  master     -> origin/master
    warning: Cannot merge binary files: blender/landscape_objects/Fallen_tree.blend (...)

    Auto-merging blender/landscape_objects/Fallen_tree.blend
    CONFLICT (content): Merge conflict in blender/landscape_objects/Fallen_tree.blend
    Automatic merge failed; fix conflicts and then commit the result.
    

The steps to be taken at conflicts are described below.



From the local - to the remote
------------------------------

After that the changes should be uploaded from the local repository to the remote ("shared") one to make the changes available for team mates.

.. code-block:: none

    > git push

The result of the ``git push`` command if the remote repository already contains all the local changes:

.. code-block:: none

    Everything up-to-date 

The result of the ``git push`` command if synchronization was successful:

.. code-block:: none

    Counting objects: 25, done. 
    Delta compression using up to 8 threads. 
    Compressing objects: 100% (14/14), done. 
    Writing objects: 100% (14/14), 1.23 KiB, done. 
    Total 14 (delta 11), reused 0 (delta 0) 
    To gfxteam@lixer:blend4web.git 
       9f9700c..fa1d6ac  master -> master

The result of the ``git push`` command if synchronization was not successful because the ``git pull`` command was not executed first:

.. code-block:: none

    To gfxteam@lixer:blend4web.git 
     ! [rejected]        master -> master (non-fast-forward) 
    error: failed to push some refs to 'gfxteam@lixer:blend4web.git' 
    To prevent you from losing history, non-fast-forward updates were rejected 
    Merge the remote changes (e.g. 'git pull') before pushing again.  See the 
    'Note about fast-forwards' section of 'git push --help' for details. 

You should execute the ``git pull`` command.

The changes uploaded into the central repository can be received by other developers with the ``git pull`` command.



.. index:: git; resolving conflicts

Resolving Conflicts
===================

Overview
--------

Synchronization conflicts occur if both conditions are met

#. the same file was changed both in the local and remote repositories, and
#. automatic merging of the changes didn't occur because the changes are in the same place of the file.

Typical cases: 

#. a binary file (texture, blend file) was independently changed by two developers
#. different changes were introduced to the same line of the same text file
#. one developer has changed the file while the other has moved it and so on.

Although synchronization conflicts are normal, if they happen too often it slows down the work. It is recommended to notify your team mates about start of working with the shared binary files, and also to perform synchronization more often. It is necessary to effectively distribute the work between developers to reduce the number of such shared files. This can be achieved particularly through linking of all the scene's resources from the separate blend files into the master file.


The steps to be taken
---------------------

It's not recommended to perform any files operations (modifying, deleting) while the repository is in a conflict state.

The first thing to do is to perform the ``git status`` command.

.. code-block:: none

    # On branch master
    # Your branch and 'origin/master' have diverged,
    # and have 7 and 1 different commit each, respectively.
    #
    # Unmerged paths:
    #   (use "git add/rm <file>..." as appropriate to mark resolution)
    #
    #	both modified:      blender/landscape_objects/Fallen_tree.blend
    #
    no changes added to commit (use "git add" and/or "git commit -a")

A list of conflicting files can be found in the ``Unmerged paths`` section. 

The order of the following steps is different for binary and text files. 

Binary files
------------

At this stage the conflicting binary files are in the same state as they were in the local repository before the synchronization attempt. The files are fully functional (for example they can be opened by graphics editors).

In case of conflicting binary files it's necessary to sort out (with the team mates or by yourself) which of the files should be left and which should be discarded. Selecting can be performed with the ``git checkout`` command.

Select the local version of the file (**- -ours**). To make sure that it's local you can open it.

.. code-block:: none

    > git checkout --ours blender/landscape_objects/Fallen_tree.blend
    
Select the remote version of the file (**- -theirs**). To make sure that it's remote you can open it.
    
.. code-block:: none

    > git checkout --theirs blender/landscape_objects/Fallen_tree.blend

Select the local version of the file again (**- -ours**).

.. code-block:: none

    > git checkout --ours blender/landscape_objects/Fallen_tree.blend
 
Eventually you have to stick to the right version of the file. In case there is a threat of losing the work you may save the discarded file outside the repository.


Text files
----------

At this stage Git introduces both local and remote changes to the conflicting text files, in a special format. Such text files are not workable as a rule

Example. One developer changed the scene name from "Blue Lizard" to "Green Lizard" in the application file and uploaded the changes into the central repository. Another developer changed "Blue Lizard" to "Red Lizard" in the same line, performed commit and executed the ``git pull`` command. As a result this very developer will be responsible for resolving the conflict. The following lines will be present in his version of the application file:

.. code-block:: none

    <<<<<<< HEAD
                    "name": "Red Lizard",
    =======
                    "name": "Green Lizard",
    >>>>>>> 81bf4e2d5610d500ad4d2a2605ee7e61f759f201

In case of conflicting text files the following steps can be taken. Files with source code should be edited with or without respect to the changes introduced by both parties. On the other hand, it is easier to reexport the exported scene text files (ending with **.json**).


Correcting commit
-----------------

After selecting the required files or editing the changes, add them for commit:

.. code-block:: none

    > git add blender/landscape_objects/Fallen_tree.blend
    > git status

Possible result of ``git status`` command after adding the conflicting files for commit:

.. code-block:: none

    # On branch master
    # Your branch and 'origin/master' have diverged,
    # and have 7 and 1 different commit each, respectively.
    #
    nothing to commit (working directory clean)

Perform commit. It is recommended to leave the default comment:

.. code-block:: none

    > git commit
    > git status

.. code-block:: none

    # On branch master
    # Your branch is ahead of 'origin/master' by 8 commits.
    #
    nothing to commit (working directory clean)

Conflicts are resolved, the changes from the remote repository are successfully applied in the local repository. Now the changes in the local repository - including the just resolved conflict - can be uploaded to the remote repository with the ``git push`` command.



.. index:: git; tags

.. _git_tags:

Tags
====

Tags are intended for pointing at a certain commit, for example, to specify a stable product version.

View the list of tags:

.. code-block:: none

    > git tag


Create a tag for the release from June 3, 2013, pointing to the commit with a stable product version:

.. code-block:: none

    > git tag R130603 67bb597f7ed1643ed0220d57e894f28662e614e5


Check the commit tag information:

.. code-block:: none

    > git show --shortstat R130603


Roll back to the tag...

.. code-block:: none

    > git checkout R130603


...and return:

.. code-block:: none

    > git checkout master


Synchronize the tags with the remote repository:

.. code-block:: none

    > git push --tags


Delete the tag (if created by mistake):

.. code-block:: none

    > git tag -d R130603


Other Useful Commands
=====================

Check the log for January, 2012, show file names without merging commits:

.. code-block:: none

    > git log --after={2012-01-01} --before={2012-01-31} --name-only --no-merges    

