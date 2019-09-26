 * Copyright (C) Linaro Limited 2016,2017,2019
 * Author: Matt Hart <matthew.hart@linaro.org>
 * Author: Milo Casagrande <milo.casagrande@linaro.org>
 *
/* globals onmessage: true, postMessage: true */
/*!
 * kernelci dashboard.
 * 
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
/**
 * Extract the compilers used for the build.
 *
 * @param {Object} message
**/
onmessage = function(message) {
    'use strict';
    var gCompilers;

    gCompilers = {};

    function parseBuildData(build) {
        var compiler;
        var compilerArray;

        compiler = build.compiler_version_full;
        if (compiler) {
            if (!gCompilers.hasOwnProperty(build.arch)) {
                gCompilers[build.arch] = compilerArray = [];
            } else {
                compilerArray = gCompilers[build.arch];
            }

            if (compilerArray.indexOf(compiler) === -1) {
                compilerArray.push(compiler);
            }
        }
    }

    if (message.data) {
        message.data.forEach(parseBuildData);
    }

    postMessage(gCompilers);
};
