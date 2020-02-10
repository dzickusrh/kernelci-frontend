/*!
 * kernelci dashboard.
 *
 * Copyright (C) 2020 Collabora Limited
 * Author: Guillaume Tucker <guillaume.tucker@collabora.com>
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 */

require([
    'jquery',
    'utils/init',
    'utils/html',
    'utils/error',
    'utils/request',
    'utils/table',
    'components/test/view',
    'tables/test',
    'charts/passpie',
], function($, init, html, error, request, table, testView, ttest, chart) {
    'use strict';
    var gJob;
    var gBranch;
    var gKernel;
    var gPlan;
    var gSearchFilter;
    var gFileServer;
    var gPanel;

    function updateDetails(results) {
        var job;
        var branch;
        var kernel;
        var commit;
        var plan;
        var treeNode;
        var jobLink;
        var describeNode;
        var buildsLink;
        var gitNode;
        var createdOn;
        var dateNode;

        job = results.job;
        branch = results.git_branch;
        kernel = results.kernel;
        commit = results.git_commit;
        plan = results.name;

        treeNode = html.tooltip();
        treeNode.title = "Details for tree &#171;" + job + "&#187;"
        jobLink = document.createElement('a');
        jobLink.href = "/job/" + job + "/";
        jobLink.appendChild(html.tree());
        treeNode.appendChild(document.createTextNode(job));
        treeNode.insertAdjacentHTML('beforeend', '&nbsp;&mdash;&nbsp;');
        treeNode.appendChild(jobLink);

        describeNode = html.tooltip();
        describeNode.title =
            "Build reports for &#171;" + job + "&#187; - " + kernel;
        buildsLink = document.createElement('a');
        buildsLink.href = "/build/" + job + "/kernel/" + kernel;
        buildsLink.appendChild(html.build());
        describeNode.appendChild(document.createTextNode(kernel));
        describeNode.insertAdjacentHTML('beforeend', '&nbsp;&mdash;&nbsp;');
        describeNode.appendChild(buildsLink);

        gitNode = document.createElement('a')
        gitNode.appendChild(document.createTextNode(results.git_url))
        gitNode.href = results.git_url
        gitNode.title = "Git URL" /* ToDo: link to commit when possible */

        createdOn = new Date(results.created_on.$date);
        dateNode = document.createElement('time');
        dateNode.setAttribute('datetime', createdOn.toISOString());
        dateNode.appendChild(
            document.createTextNode(createdOn.toCustomISODate()));

        html.replaceContent(
            document.getElementById('tree'), treeNode);
        html.replaceContent(
            document.getElementById('git-branch'),
            document.createTextNode(branch));
        html.replaceContent(
            document.getElementById('git-describe'), describeNode)
        html.replaceContent(
            document.getElementById('git-url'), gitNode);
        html.replaceContent(
            document.getElementById('git-commit'),
            document.createTextNode(commit));
        html.replaceContent(
            document.getElementById('job-date'), dateNode);
    }

    function updateRuns(results) {
        var failButton;

        if (gSearchFilter && gSearchFilter.length > 0) {
            switch (gSearchFilter) {
            case 'fail':
                document.getElementById('#fail-cell').click();
                break;
            case 'success':
                document.getElementById('#success-cell').click();
                break;
            case 'unknown':
                document.getElementById('#unknown-cell').click();
                break;
            }
        } else {
            gPanel = testView(results, gFileServer);
            gPanel.draw();

            /*
            html.addClass(
                document.getElementById('all-btn'), 'active');
            */
        }

        if (false) {
            Array.prototype.forEach.call(
                document.getElementsByClassName('df-failed'),
                function(element) {
                    element.style.setProperty('display', 'block');
                }
            );
            Array.prototype.forEach.call(
                document.getElementsByClassName('df-success'),
                function(element) {
                    element.style.setProperty('display', 'none');
                }
            );
            Array.prototype.forEach.call(
                document.getElementsByClassName('df-unknown'),
                function(element) {
                    element.style.setProperty('display', 'none');
                }
            );

            failButton = document.getElementById('fail-btn');
            Array.prototype.forEach.call(
                failButton.parentElement.children, function(element) {
                    if (element === failButton) {
                        html.addClass(element, 'active');
                    } else {
                        html.removeClass(element, 'active');
                    }
                }
            );
        }
    }

    function getRegressionsFailed() {
        console.log("getRegressionsFailed()");
    }

    function getRegressionsDone(response) {
        console.log("getRegressionsDone()");
        function parseBatchData(data) {
            var panelId = data.operation_id + '-panel';
            var statusId = data.operation_id + '-status';
            var status;
            var panelNode;
            var statusNode;
            var statusParent;

            status = (data.result[0].count == 0 ? "PASS" : "FAIL");
            panelNode = document.getElementById(panelId);
            gPanel.addFilterClass(panelNode, status);
            statusNode = gPanel.createStatusNode(status);
            statusParent = document.getElementById(statusId);
            html.replaceContent(statusParent, statusNode);

            console.log(data.operation_id);
            console.log(status);
            console.log(data.result[0]);
        }

        response.result.forEach(parseBatchData);
    }

    function getBatchRegressions(results) {
        var batchOps;
        var deferred;

        function createBatchOp(result) {
            var job = result.job;
            var kernel = result.kernel;
            var branch = result.git_branch;
            var plan = result.name;
            var deviceType = result.device_type;
            var buildEnv = result.build_environment;
            var defconfig = result.defconfig_full;
            var qStr;
            var idStr;

            qStr = 'job=' + job;
            qStr += '&kernel=' + kernel;
            qStr += '&git_branch=' + branch;
            qStr += '&plan=' + plan;
            qStr += '&device_type=' + deviceType;
            qStr += '&build_environment=' + buildEnv;
            qStr += '&defconfig_full=' + defconfig;

            idStr = gPanel.createDataIndex(result);

            batchOps.push({
                method: 'GET',
                operation_id: idStr,
                resource: 'test_regression',
                query: qStr,
            });
        }

        batchOps = [];
        results.forEach(createBatchOp)
        deferred = request.post(
            '/_ajax/batch', JSON.stringify({batch: batchOps}));

        $.when(deferred)
            .fail(error.error, getRegressionsFailed)
            .done(getRegressionsDone);
    }

    function getRunsFailed() {
        console.log("getRunsFailed()");
    }

    function getRunsDone(response) {
        updateDetails(response.result[0]);
        updateRuns(response.result);
        getBatchRegressions(response.result);
    }

    function getRuns() {
        var data;
        var deferred;

        data = {
            job: gJob,
            git_branch: gBranch,
            kernel: gKernel,
            name: gPlan,
            parent_id: 'null',
            sort: 'device_type',
            sort_order: 1,
        };

        deferred = request.get('/_ajax/test/group', data);
        $.when(deferred)
            .fail(error.error, getRunsFailed)
            .done(getRunsDone);
    }

    if (document.getElementById('job-name') !== null) {
        gJob = document.getElementById('job-name').value;
    }
    if (document.getElementById('branch-name') !== null) {
        gBranch = document.getElementById('branch-name').value;
    }
    if (document.getElementById('kernel-name') !== null) {
        gKernel = document.getElementById('kernel-name').value;
    }
    if (document.getElementById('plan-name') !== null) {
        gPlan = document.getElementById('plan-name').value;
    }
    if (document.getElementById('search-filter') !== null) {
        gSearchFilter = document.getElementById('search-filter').value;
    }
    if (document.getElementById('file-server') !== null) {
        gFileServer = document.getElementById('file-server').value;
    }

    Array.prototype.forEach.call(
        document.querySelectorAll('.btn-group > .btn'),
        function(btn) {
            btn.addEventListener('click', function() {
                Array.prototype.forEach.call(
                    btn.parentElement.children, function(element) {
                    if (element === btn) {
                        html.addClass(element, 'active');
                    } else {
                        html.removeClass(element, 'active');
                    }
                });
            });
        }
    );

    setTimeout(getRuns, 10);

    setTimeout(init.hotkeys, 50);
    setTimeout(init.tooltip, 50);
});
