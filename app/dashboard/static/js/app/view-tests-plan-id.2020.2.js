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
    'components/test/common',
    'tables/test',
    'utils/error',
    'utils/init',
    'utils/html',
    'utils/request',
    'utils/table',
    'utils/urls',
], function($, tcommon, ttable, error, init, html, request, table, urls) {
    'use strict';

    var gPlanId;
    var gFileServer;
    var gTestsTable;

    setTimeout(function() {
        document.getElementById('li-test').setAttribute('class', 'active');
    }, 15);

    function detailsFailed() {
        html.replaceByClassTxt('loading-content', '?');
    }

    function updateDetails(results) {
        var deviceType;
        var job;
        var kernel;
        var plan;
        var treeNode;
        var jobLink;
        var describeNode;
        var buildsLink;
        var gitNode;
        var createdOn;
        var dateNode;
        var translatedURI;
        var logNode;

        job = results.job;
        kernel = results.kernel;
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

        gitNode = document.createElement('a');
        gitNode.appendChild(document.createTextNode(results.git_url));
        gitNode.href = results.git_url;
        gitNode.title = "Git URL"; /* ToDo: link to commit when possible */

        createdOn = new Date(results.created_on.$date);
        dateNode = document.createElement('time');
        dateNode.setAttribute('datetime', createdOn.toISOString());
        dateNode.appendChild(
            document.createTextNode(createdOn.toCustomISODate()));

        translatedURI = urls.createFileServerURL(gFileServer, results);
        logNode = tcommon.logsNode(
            results.boot_log, results.boot_log_html, results.lab_name,
            translatedURI[0], translatedURI[1]);

        html.replaceContent(
            document.getElementById('lab-name'),
            document.createTextNode(results.lab_name));
        html.replaceContent(
            document.getElementById('plan-name'),
            document.createTextNode(results.name));
        html.replaceContent(
            document.getElementById('device-type'),
            document.createTextNode(results.device_type));
        html.replaceContent(
            document.getElementById('tree'), treeNode);
        html.replaceContent(
            document.getElementById('git-branch'),
            document.createTextNode(results.git_branch));
        html.replaceContent(
            document.getElementById('git-describe'), describeNode)
        html.replaceContent(
            document.getElementById('git-url'), gitNode);
        html.replaceContent(
            document.getElementById('git-commit'),
            document.createTextNode(results.git_commit));
        html.replaceContent(
            document.getElementById('arch'),
            document.createTextNode(results.arch));
        html.replaceContent(
            document.getElementById('defconfig'),
            document.createTextNode(results.defconfig_full));
        html.replaceContent(
            document.getElementById('compiler'),
            document.createTextNode(results.compiler_version_full));
        html.replaceContent(
            document.getElementById('job-date'), dateNode);
        html.replaceContent(
            document.getElementById('job-log'), logNode);
    }

    function updateTestsTable(results) {
        var columns;
        var data;

        function _addData(item) {
            var status;

            if (item.status == 'PASS')
                status = 'PASS';
            else if (item.regression_id)
                status = 'FAIL';
            else
                status = 'UNKNOWN';

            data.push({
                'test_case_path': item.test_case_path,
                'status': status,
                '_id': item._id,
            });
        }

        function _renderStatus(data, type) {
            if (type == "display") {
                var node = document.createElement('div');
                node.appendChild(ttable.statusNode(data));
                return node.outerHTML;
            }
        }

        data = [];
        results.forEach(_addData);

        columns = [
            {
                title: 'Test case path',
                data: 'test_case_path',
                type: 'string',
                className: 'test-group-column',
            },
            {
                title: 'Status',
                data: 'status',
                type: 'list',
                className: 'pull-center',
                searchable: false,
                orderable: false,
                render: _renderStatus,
            },
        ];

        gTestsTable
            .data(data)
            .columns(columns)
            .order([0, 'asc'])
            .rowURL('/test/case/id/%(_id)s/')
            .rowURLElements(['_id'])
            .paging(true)
            .info(false)
            .draw();
    }

    function getTestsFailed() {
        html.removeElement(document.getElementById('table-loading'));
        html.replaceContent(
            document.getElementById('table-div'),
            html.errorDiv('No test data available.')
        );
    }

    function getTestsDone(response) {
        if (response.result.length === 0) {
            getTestsFailed();
            return
        }

        updateTestsTable(response.result);
    }

    function getTests(results) {
        var data;
        var deferred;

        data = {
            job: results.job,
            kernel: results.kernel,
            git_branch: results.git_branch,
            plan: results.name,
            device_type: results.device_type,
            arch: results.arch,
            build_environment: results.build_environment,
            sort: 'test_case_path',
        };

        deferred = request.get('/_ajax/test/case', data)
        $.when(deferred)
            .fail(error.error, getTestsFailed)
            .done(getTestsDone);
    }

    function getPlanFailed() {
        detailsFailed();
    }

    function getPlanDone(response) {
        var results = response.result[0];

        updateDetails(results);
        getTests(results);
    }

    function getPlan() {
        if (!gPlanId) {
            getPlanFailed();
            return
        }

        $.when(request.get('/_ajax/test/group', {id: gPlanId}))
            .fail(error.error, getPlanFailed)
            .done(getPlanDone);
    }

    if (document.getElementById('plan-id') !== null) {
        gPlanId = document.getElementById('plan-id').value;
    }
    if (document.getElementById('file-server') !== null) {
        gFileServer = document.getElementById('file-server').value;
    }

    gTestsTable = table({
        tableId: 'tests-table',
        tableLoadingDivId: 'table-loading',
        tableDivId: 'table-div',
    });

    setTimeout(getPlan, 10);

    setTimeout(init.hotkeys, 50);
    setTimeout(init.tooltip, 50);
});
