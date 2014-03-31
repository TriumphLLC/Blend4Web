.. index:: git

.. _git_short_manual:

**********************
Краткая справка по git
**********************

.. _what_is_git:

Назначение
==========

Git - система контроля версий файлов. Основная функция git - сохранение истории изменений с возможностью возврата к предыдущим версиям файлов. Другая важная функция - синхронизация с автоматическим слиянием изменений.


.. _git_pipeline:

Типичный рабочий процесс
========================

#. Каждый сотрудник имеет собственный локальный репозиторий (хранилище).
#. В ходе работы в репозитории создаются, изменяются или удаляются файлы.
#. По завершении некоторого логического этапа работы возникает необходимость фиксации изменений (коммит) и/или синхронизации с коллегами.
#. Проводится подготовка файлов к коммиту - учет измененных, новых и удаленных файлов, а также сброс изменений.
#. Осуществляется коммит.
#. Проводится синхронизация с коллегами.


.. index:: git; индивидуальные настройки 

.. _git_config:

Индивидуальные настройки
========================

Новый пользователь устанавливает имя и почтовый адрес командами:

.. code-block:: none
    
    > git config --global user.name "Ivan Petrov"
    > git config --global user.email petrov.ivan@brit.co.ru


.. index:: git; начало работы

.. _git_example_begin:

Пример - начало работы
======================

Перейти в репозиторий:

.. code-block:: bash

    > cd ~/my_git_repo


Проверить статус:

.. code-block:: none
    
    > git status


Результат команды ``git status``, если все коммиты проведены и нет новых файлов:

.. code-block:: none

    # On branch master 
    # Your branch is ahead of 'origin/master' by 2 commits. 
    # 
    nothing to commit (working directory clean) 

Возможный результат команды ``git status``, если имеются изменения. Например, файлы :file:`apps_dev/firstperson/firstperson.js` и :file:`doc_src/git_short_manual.rst` изменены, и создан новый файл :file:`123.txt`:

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


.. index:: git; подготовка к коммиту

.. _git_example_prepare_to_commit:

Пример - подготовка к коммиту
=============================

Проверка изменений
------------------

Проверить, что изменилось, во всей директории:

.. code-block:: none

    > git diff

или только в определенном файле:

.. code-block:: none

    > git diff apps_dev/firstperson/firstperson.js

Возможный результат команды ``git diff`` для текстового файла:

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

Восстановление файлов
---------------------

Если файл был изменен или удален, но его необходимо восстановить (до состояния, зафиксированного последним коммитом), следует использовать команду:

.. code-block:: none

    > git checkout doc_src/git_short_manual.rst
    > git checkout 123.txt


Посторонние файлы
-----------------

Если файл значится в списке ``Untracked files`` (команда ``git status``), но контроль версий для него не нужен, его следует удалить или переместить за пределы рабочей директории.


.. index:: git; добавление и удаление файлов

.. _git_example_add_rm_commit:

Пример - добавление и удаление файлов для коммита
=================================================

Добавление файлов
-----------------

Если изменения устраивают, добавить нужные измененные и/или новые файлы для коммита:

.. code-block:: none

    > git add apps_dev/firstperson/firstperson.js
    > git add 123.txt

Снова проверить статус:

.. code-block:: none
    
    > git status

Возможный результат команды ``git status`` после добавления некоторых файлов командой ``git add``:

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

Видно, что для коммита добавлены файлы :file:`apps_dev/firstperson/firstperson.js` и :file:`123.txt`, а файл :file:`doc_src/git_short_manual.rst` остался недобавленным.

Удаление файлов
---------------

Некоторые файлы могут быть отмечены как удаленные из git после выполнения команды ``git status``, например:

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

В таком случае, если удаление файла должно быть зафиксировано (т.е. войти в коммит), выполнить команду ``git rm``, например:

.. code-block:: none

    > git rm 123.txt


.. index:: git; коммит

.. _git_commit:

Пример - коммит
===============

Выполнение коммита
------------------

Выполнить коммит командой:

.. code-block:: none

    > git commit

Появится окно текстового редактора (например, nano или vim), в котором нужно ввести комментарий к коммиту на английском языке.

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

Сохранить изменения и выйти из редактора (в nano Ctrl+O, затем Ctrl+X; в vim ZZ, или ESC :wq).


После коммита
-------------

После совершения коммита рекомендуется снова проверить статус.

.. code-block:: none
    
    > git status

Возможный результат команды ``git status`` после совершения коммита:

.. code-block:: none

    # On branch master
    # Your branch is ahead of 'origin/master' by 1 commit.
    #
    # Changes not staged for commit:
    #   (use "git add <file>..." to update what will be committed)
    #   (use "git checkout -- <file>..." to discard changes in working directory)
    #
    #	modified:   doc_src/git_short_manual.rst
    #
    no changes added to commit (use "git add" and/or "git commit -a")

Как видно, изменения в файле :file:`doc_src/git_short_manual.rst` не зафиксированы. Необходимо завершить добавление файлов и коммиты, либо восстановить измененные файлы. Иначе говоря, необходимо добиться, чтобы команда ``git status`` отображала ``nothing to commit (working directory clean)``.


.. index:: git; синхронизация между репозиториями

.. _git_example_repo_sync:

Пример - синхронизация между репозиториями
==========================================

Из удаленного - в локальный
---------------------------

После того как все коммиты сделаны, синхронизировать локальный репозиторий с удаленным:

.. code-block:: none

    > git pull

Результат команды ``git pull``, если в удаленном репозитории нет изменений:

.. code-block:: none

    Already up-to-date.

Результат команды ``git pull``, если в удаленном репозитории были изменения, и синхронизация прошла успешно:

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
     create mode 100644    external/deploy/assets/location_agriculture/textures/rotonda_02_diff.png 

Посмотреть, какие изменения были внесены коллегами:

.. code-block:: none

    > git diff dbf3877..9f9700c

Посмотреть лог:

.. code-block:: none

    > git log

Результат команды ``git pull``, если в удаленном репозитории были изменения, но синхронизация не прошла успешно, потому что есть конфликты:

.. code-block:: none

    remote: Counting objects: 11, done.
    remote: Compressing objects: 100% (6/6), done.
    remote: Total 6 (delta 5), reused 0 (delta 0)
    Unpacking objects: 100% (6/6), done.
    From lixer:blend4web
       ff715c2..dbf316a  master     -> origin/master
    warning: Cannot merge binary files: external/blender/landscape_objects/Fallen_tree.blend (HEAD vs. dbf316af89eb0c7020259250ebeafc530f63ea1c)

    Auto-merging external/blender/landscape_objects/Fallen_tree.blend
    CONFLICT (content): Merge conflict in external/blender/landscape_objects/Fallen_tree.blend
    Automatic merge failed; fix conflicts and then commit the result.


.. index:: git; разрешение конфликтов

Разрешение конфликтов
---------------------

Конфликты синхронизации происходят, если выполнены оба условия

#. один и тот же файл был изменен как в локальном, так и в удаленном репозитории, и
#. автоматическое слияние изменений не произошло, поскольку изменения находятся в одном и том же месте файла.

Типичные случаи: 

#. бинарный файл (текстура, blend-файл) изменен двумя сотрудниками 
#. в текстовой файл в одной и той же строке были внесены разные изменения
#. один сотрудник изменил файл, а другой - переместил его и т.п.

Хотя конфликты синхронизации - нормальное явление, слишком частое их возникновение замедляет работу. Рекомендуется ставить коллег в известность о начале работ с бинарными файлами, а также чаще проводить синхронизацию.

Первое что необходимо сделать - выполнить команду ``git status``.

.. code-block:: none

    # On branch master
    # Your branch and 'origin/master' have diverged,
    # and have 7 and 1 different commit each, respectively.
    #
    # Unmerged paths:
    #   (use "git add/rm <file>..." as appropriate to mark resolution)
    #
    #	both modified:      external/blender/landscape_objects/Fallen_tree.blend
    #
    no changes added to commit (use "git add" and/or "git commit -a")

Список конфликтующих файлов отображен в разделе ``Unmerged paths``. На данном этапе конфликтующие файлы находятся в следующем состоянии:

#. бинарные файлы - в том состоянии, в котором они находились в локальном репозитории до попытки синхронизации, при этом файлы полностью функциональны (например, открываются графическими редакторами)
#. текстовые файлы - git'ом вносятся как локальные, так и удаленные изменения одновременно, в особом формате, так что такие текстовые файлы как правило, не работоспособны

В случае конфликта бинарных файлов необходимо выяснить с коллегами или самостоятельно, какую из версий оставить, а какую отобросить. Выбор осуществляется командой ``git checkout``.

Выбрать локальную версию файла. Его можно открыть и убедиться в этом.

.. code-block:: none

    > git checkout --ours external/blender/landscape_objects/Fallen_tree.blend
    
Выбрать удаленную версию файла. Его можно открыть и убедиться в этом.
    
.. code-block:: none

    > git checkout --theirs external/blender/landscape_objects/Fallen_tree.blend

Снова выбрать локальную версию файла.

.. code-block:: none

    > git checkout --ours external/blender/landscape_objects/Fallen_tree.blend
    
В случае конфликта текстовых файлов можно поступить следующим образом. Файлы, содержащие исходный код, необходимо отредактировать с учетом или без учета внесенных обеими сторонами изменений. Файлы, экспортированные из приложений, проще повторно экспортировать.

После выбора нужных файлов или редактирования изменений, добавить их для коммита:

.. code-block:: none

    > git add external/blender/landscape_objects/Fallen_tree.blend
    > git status

Возможный результат выполнения ``git status`` после добавления конфликтующих файлов для коммита:

.. code-block:: none

    # On branch master
    # Your branch and 'origin/master' have diverged,
    # and have 7 and 1 different commit each, respectively.
    #
    nothing to commit (working directory clean)

Выполнить коммит, комментарий рекомендуется оставить предложенный по умолчанию:

.. code-block:: none

    > git commit
    > git status

.. code-block:: none

    # On branch master
    # Your branch is ahead of 'origin/master' by 8 commits.
    #
    nothing to commit (working directory clean)

Конфликты разрешены, синхронизация с удаленным репозиторием закончена.

Из локального - в удаленный
---------------------------

Затем нужно синхронизировать удаленный репозиторий с локальным, чтобы изменения были доступны в удаленном репозитории:

.. code-block:: none

    > git push

Результат команды ``git push``, если в удаленном репозитории уже есть все локальные изменения:

.. code-block:: none

    Everything up-to-date 

Результат команды ``git push``, если синхронизация прошла успешно:

.. code-block:: none

    Counting objects: 25, done. 
    Delta compression using up to 8 threads. 
    Compressing objects: 100% (14/14), done. 
    Writing objects: 100% (14/14), 1.23 KiB, done. 
    Total 14 (delta 11), reused 0 (delta 0) 
    To gfxteam@lixer:blend4web.git 
       9f9700c..fa1d6ac  master -> master

Результат команды ``git push``, если синхронизация не прошла, потому что сначала не была выполнена команда ``git pull``:

.. code-block:: none

    To gfxteam@lixer:blend4web.git 
     ! [rejected]        master -> master (non-fast-forward) 
    error: failed to push some refs to 'gfxteam@lixer:blend4web.git' 
    To prevent you from losing history, non-fast-forward updates were rejected 
    Merge the remote changes (e.g. 'git pull') before pushing again.  See the 
    'Note about fast-forwards' section of 'git push --help' for details. 

Необходимо выполнить команду ``git pull``.


.. index:: git; тэги

.. _git_tags:

Памятка по тэгам для разработчиков
==================================

Просмотреть список тэгов:

.. code-block:: none

    > git tag


Создать тэг для релиза от 3 июня 2013 г., указывающий на коммит со стабильной версией проекта:

.. code-block:: none

    > git tag R130603 67bb597f7ed1643ed0220d57e894f28662e614e5


Просмотреть информацию о коммите тэга:

.. code-block:: none

    > git show --shortstat R130603


Перейти к тэгу...

.. code-block:: none

    > git checkout R130603


...и вернуться:

.. code-block:: none

    > git checkout master


Синхронизировать тэги с удаленным репозиторием:

.. code-block:: none

    > git push --tags


Удалить тэг (при ошибочном создании):

.. code-block:: none

    > git tag -d R130603


Другие полезные команды
=======================

Просмотреть лог за январь 2012 г, показывать имена файлов, без коммитов слияния:

.. code-block:: none

    > git log --after={2012-01-01} --before={2012-01-31} --name-only --no-merges    

