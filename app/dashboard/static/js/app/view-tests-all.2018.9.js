/*!
 * kernelci dashboard.
 * 
 * Copyright (C) 2020 Collabora Limited
 * Author: Alexandra Pereira <alexandra.pereira@collabora.com>
 * 
 * Copyright (C) 2014, 2015, 2016, 2017  Linaro Ltd.
 * Copyright (c) 2017 BayLibre, SAS.
 * Author: Loys Ollivier <lollivier@baylibre.com>
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
    'utils/format',
    'utils/error',
    'utils/request',
    'utils/table',
    'utils/html',
    'utils/const',
    'tables/test',
    'URI'
], function(
        $,
        init, format, error, request, table, html, appconst, ttest, URI) {
    'use strict';

    var gDateRange;
    var gSearchFilter;
    var gPageLen;
    var gTestsTable;
    var gTestStatus = {};

    setTimeout(function() {
        document.getElementById('li-test').setAttribute('class', 'active');
    }, 15);

    gDateRange = appconst.MAX_DATE_RANGE;

    function getBatchStatusDone(results) {
        function parseBatchData(data) {
            gTestStatus[data.operation_id] = (data.result[0].count == 0 ? "PASS" : "FAIL");
            var node = document.getElementById(data.operation_id);
            if (node != null){
                node.firstChild.replaceWith(ttest.statusNode(gTestStatus[data.operation_id]));
            }
        }
        results.result.forEach(parseBatchData);
    }

    function getBatchStatusFailed() {
        console.log("getBatchStatusFailed()");
    }

    function getBatchStatus(results) {
        var batchOps;
        var deferred;

        function createBatchOp(result) {
            var qStr;
            var plan = result.testPlan.name;

            qStr = URI.buildQuery({
                'job': result.testPlan.job,
                'kernel': result.testPlan.kernel,
                'board': result.testPlan.board,
                'plan': plan,
            });

            /* Number of test case regressions */
            batchOps.push({
                method: 'GET',
                operation_id: 'status-' +result.testPlan.board+'-'+result.testPlan.kernel,
                resource: 'count',
                document: 'test_regression',
                query: qStr,
            });
        }

        batchOps = [];
        results.forEach(createBatchOp);
        deferred = request.post(
            '/_ajax/batch', JSON.stringify({batch: batchOps}));

        $.when(deferred)
            .fail(error.error, getBatchStatusFailed)
            .done(getBatchStatusDone)
    }

    function updateTestTable(response) {
        var columns;
        
        function _renderDetails(data, type) {
            return ttest.renderDetails(
                '/test/plan/id/' + data, type);
        }

        function _renderStatus(data, type) {
            if (type == "display") {
                var node = document.createElement('div');
                node.id = 'status-' +data.board+'-'+data.kernel;
                node.appendChild(ttest.statusNode(gTestStatus[node.id]));
                return node.outerHTML;
            }
        }

        if (response.length === 0) {
            html.removeElement(document.getElementById('table-loading'));
            html.replaceContent(
                document.getElementById('table-div'),
                html.errorDiv('No data found.'));
        } else {
            columns = [
                {
                    data: 'testPlan.job',
                    title: 'Tree',
                    type: 'string',
                    className: 'tree-column',
                },
                {
                    data: 'testPlan.git_branch',
                    title: 'Branch',
                    type: 'string',
                    className: 'branch-column',
                },
                {
                    data: 'testPlan.kernel',
                    title: 'Kernel',
                    type: 'string',
                    className: 'kernel-column'
                },
                {
                    data: 'testPlan.defconfig_full',
                    title: 'Defconfig',
                    type: 'string',
                    className: 'defconfig-column',
                },
                {
                    data: 'testPlan.build_environment',
                    title: 'Compiler',
                    type: 'string',
                    className: 'build-column',
                },
                {
                    data: 'testPlan.arch',
                    title: 'Architecture',
                    type: 'string',
                    className: 'type-column',
                },
                {
                    data: 'testPlan.device_type',
                    title: 'Device Type',
                    type: 'string',
                    className: 'device-column',
                },
                {
                    data: 'testPlan.lab_name',
                    title: 'Lab',
                    type: 'string',
                    className: 'lab-column',
                },
                {
                    data: 'testPlan.name',
                    title: 'Test Plan',
                    type: 'string',
                    className: 'plan-column',
                },
                {
                    data: 'testPlan.created_on',
                    title: 'Date',
                    type: 'date',
                    className: 'date-column',
                    render: ttest.renderDate
                },
                {
                    data: 'testPlan',
                    title: 'Status',
                    type: 'string',
                    searchable: false,
                    orderable: false,
                    className: 'pull-center',
                    render: _renderStatus,
                },
                {
                    data: 'testPlan._id.$oid',
                    title: 'Plan Details',
                    type: 'string',
                    orderable: false,
                    searchable: false,
                    className: 'select-column pull-center',
                    render: _renderDetails
                }
            ];

            gTestsTable
                .data(response)
                .columns(columns)
                .order([0, 'asc'])
                .languageLengthMenu('Tests per page')
                .rowURL('/test/plan/id/%(_id)s/')
                .rowURLElements(['_id'])
                .draw();
        }
    }

    function enableSearch() {
        gTestsTable
            .pageLen(gPageLen)
            .search(gSearchFilter);
    }

    function getTestsDone(response){
        updateTestTable(response);
        getBatchStatus(response);
    }

    function getTestsParse(response) {
        var results;

        // Internal filter function to check valid test values.
        function _isValidBoard(data) {
            if (data && data !== null && data !== undefined) {
                return true;
            }
            return false;
        }
        // Convert a value into an object.
        function _toObject(data) {
            return {testPlan: data.result};
        }

        results = response.result;
        if (results) {
            results = results.filter(_isValidBoard);
            results = results.map(_toObject);
        }
        setTimeout(getTestsDone.bind(null, results), 25);
        setTimeout(enableSearch, 25);
    }

    function getTestsFail() {
        html.removeElement(document.getElementById('table-loading'));
        html.replaceContent(
            document.getElementById('table-div'),
            html.errorDiv('Error loading data.'));
    }

    function getTests() {
        var deferred;
        var reqData;

        reqData = {
            parent_id: 'null',
            sort: 'created_on',
            sort_order: -1,
            date_range: gDateRange,
            limit: appconst.MAX_QUERY_LIMIT,
            distinct: 'board',
            aggregate: 'kernel',
        }

        deferred = request.get('/_ajax/test/group', reqData);
        $.when(deferred)
            .fail(error.error, getTestsFail)
            .done(getTestsParse);
    }

    if (document.getElementById('date-range') !== null) {
        gDateRange = document.getElementById('date-range').value;
    }
    if (document.getElementById('search-filter') !== null) {
        gSearchFilter = document.getElementById('search-filter').value;
    }
    if (document.getElementById('page-len') !== null) {
        gPageLen = document.getElementById('page-len').value;
    }

    gTestsTable = table({
        tableId: 'tests-table',
        tableDivId: 'table-div',
        tableLoadingDivId: 'table-loading'
    });

    setTimeout(getTests, 10);

    setTimeout(init.hotkeys, 50);
    setTimeout(init.tooltip, 50);

});
