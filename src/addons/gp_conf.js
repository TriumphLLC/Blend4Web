/**
 * Copyright (C) 2014-2016 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

/**
 * Gamepads add-on.
 * @module gp_conf
 */
b4w.module["gp_conf"] = function(exports, require) {

var m_cont      = require("container");
var m_ctrl      = require("controls");
var m_input     = require("input");
var m_storage   = require("storage");

var SVG_BASE64 = "url('data:image/svg+xml;base64,";
var BLUE_COLOR_REGEXP = new RegExp("#5276cf", "g");
var BLUE_COLOR = "#5276cf";
var RED_COLOR = "#ff0000";
var GREEN_COLOR = "#00ff00";
var GREY_COLOR = "#e6e6e6";

var SELECT_BTN_CAPTION = "Click on the buttons & arrows to setup your controller";
var PRESS_BTN_CAPTION = "Now press the button on the device";
var MOVE_AXIS_CAPTION = "Now move the axis on the device";
var MAIN_DEVICE_CAPTION = "Select a device";

var AXIS_STEP = 20;

var GMPD_DFLT_STNGS = {};
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_12] = m_input.GMPD_BUTTON_12;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_13] = m_input.GMPD_BUTTON_13;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_15] = m_input.GMPD_BUTTON_15;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_14] = m_input.GMPD_BUTTON_14;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_3] = m_input.GMPD_BUTTON_3;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_0] = m_input.GMPD_BUTTON_0;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_1] = m_input.GMPD_BUTTON_1;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_2] = m_input.GMPD_BUTTON_2;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_5] = m_input.GMPD_BUTTON_5;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_7] = m_input.GMPD_BUTTON_7;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_4] = m_input.GMPD_BUTTON_4;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_6] = m_input.GMPD_BUTTON_6;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_8] = m_input.GMPD_BUTTON_8;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_9] = m_input.GMPD_BUTTON_9;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_10] = m_input.GMPD_BUTTON_10;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_11] = m_input.GMPD_BUTTON_11;
GMPD_DFLT_STNGS[m_input.GMPD_BUTTON_16] = m_input.GMPD_BUTTON_16;


var VIEWER_MODE = 0;
var BTN_EDIT_MODE = 1;
var AXIS_EDIT_MODE = 2;

// pad
var gamepad_svg = '<svg id="svg26627" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="128.51mm" viewBox="0 0 636.63517 455.33329" width="179.67mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/"><defs id="defs26629"><linearGradient id="linearGradient4691"><stop id="stop4693" offset="0"/><stop id="stop4695" stop-opacity="0" offset="1"/></linearGradient><linearGradient id="linearGradient4358"><stop id="stop4360" stop-color="#2e2e2e" offset="0"/><stop id="stop4362" stop-color="#2e2e2e" stop-opacity="0" offset="1"/></linearGradient><linearGradient id="linearGradient4364" x1="1141.5" xlink:href="#linearGradient4358" gradientUnits="userSpaceOnUse" y1="255.95" gradientTransform="matrix(-1 0 0 1 1531.4 560.1)" x2="1165.2" y2="309.88"/><linearGradient id="linearGradient4368" x1="1141.5" xlink:href="#linearGradient4358" gradientUnits="userSpaceOnUse" y1="255.95" gradientTransform="translate(-896.37 560.1)" x2="1165.2" y2="309.88"/><linearGradient id="linearGradient4430" x1="959.32" gradientUnits="userSpaceOnUse" y1="653.07" gradientTransform="matrix(-1 0 0 1 1531.4 70.097)" x2="1467.6" y2="653.07"><stop id="stop4426" stop-color="#4f4f4f" offset="0"/><stop id="stop4428" stop-color="#4f4f4f" stop-opacity="0" offset="1"/></linearGradient><linearGradient id="linearGradient4701" x1="529.91" xlink:href="#linearGradient4691" gradientUnits="userSpaceOnUse" y1="111.1" gradientTransform="translate(-52.276 546.89)" x2="481.49" y2="85.746"/><linearGradient id="linearGradient4713" x1="529.91" xlink:href="#linearGradient4691" gradientUnits="userSpaceOnUse" y1="111.1" gradientTransform="matrix(-1 0 0 1 689.01 546.89)" x2="481.49" y2="85.746"/><linearGradient id="linearGradient4725" x1="367.39" xlink:href="#linearGradient4691" gradientUnits="userSpaceOnUse" y1="125.6" gradientTransform="matrix(-1.3272 0 0 .68317 806.95 579.14)" x2="367.39" y2="116.11"/></defs><metadata id="metadata26632"><rdf:RDF><cc:Work rdf:about="">    <dc:format>image/svg+xml</dc:format>    <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/>    <dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -597.03)"><g id="g20" fill-rule="evenodd"><path id="path4209" fill="#434343" d="m576.71 1052.4c42.015-1.9097 64.296-46.468 59.204-122.86-5.0928-76.387-27.374-175.69-44.562-224.7-17.188-49.015-25.501-62.531-26.737-65.565-3.7697-9.2504-11.278-19.949-62.379-27.691-28.97-4.3891-16.697-7.9577-27.084-9.4696-17.96-2.6141-43.609-1.229-52.203 1.6354-8.594 2.8645-12.709 29.16-24.486 35.207-11.777 6.0473-19.416 10.185-80.149 10.185s-68.372-4.1376-80.149-10.185c-11.777-6.0473-18.113-32.099-25.736-36.993-11.183-7.1796-26.985-5.6722-54.891-0.57481-5.64 1.0302-1.1304 7.6212-18.165 12.509-32.913 9.4438-52.094 3.7056-65.087 20.831-1.9807 2.6106-11.822 21.096-29.01 70.111-17.179 48.95-39.46 148.25-44.553 224.64-5.0929 76.39 17.188 120.99 59.204 122.89 73.339-1.7 55.219-116.53 258.4-116.53s185.05 114.82 258.4 116.49z"/><path id="path4366" fill="url(#linearGradient4368)" d="m249.77 838.51c-107.76 0-171.55 96.288-176.84 121.23-5.2294 24.634-17.658 55.705 3.8195 53.789 9.6996-0.8655 18.053-15.713 37.559-38.193 18.78-21.643 41.379-54.425 96.763-54.425s73.209-44.877 75.119-53.152c1.9098-8.2752 2.4146-27.976-36.418-29.25z"/><path id="path4217" fill="url(#linearGradient4364)" d="m385.23 838.51c107.76 0 171.55 96.288 176.84 121.23 5.2293 24.634 17.658 55.705-3.8195 53.789-9.6996-0.8655-18.053-15.713-37.559-38.193-18.78-21.643-41.379-54.425-96.763-54.425s-73.209-44.877-75.119-53.152c-1.9098-8.2752-2.4146-27.976 36.418-29.25z"/><path id="path4370" fill="url(#linearGradient4430)" d="m572.06 654.81c-60.48-19.09-76.79-18.6-89.84-17.96-13.05 0.63657-22.638 16.617-45.237 49.4s-67.48 125.27-116.23 125.27c-48.746 0-93.626-92.491-116.23-125.27-22.599-32.783-32.008-48.942-45.059-49.579-13.05-0.63648-35.251 1.8354-95.728 20.932l1.1161-2.3404c60.494-19.1 81.754-20.83 94.804-20.19 13.05 0.63657 22.281 13.049 44.88 45.832s67.48 123.49 116.23 123.49c48.746 0 93.626-90.709 116.23-123.49 22.599-32.783 31.83-45.195 44.88-45.832 13.05-0.63648 28.783-1.6248 89.26 17.472"/><path id="path4315" fill="#343434" d="m570.99 652.48c-60.477-19.097-76.074-18.269-89.124-17.633-13.05 0.63658-22.281 14.832-44.88 47.614-22.599 32.783-67.48 125.27-116.23 125.27-48.746 0-93.626-92.491-116.23-125.27-22.599-32.783-31.83-46.978-44.88-47.614-13.05-0.63648-34.715 1.2996-95.192 20.396l1.1161-2.3404c60.474-19.1 81.024-22.26 94.074-21.62 13.05 0.63658 22.281 13.049 44.88 45.832s67.48 123.49 116.23 123.49c48.746 0 93.626-90.709 116.23-123.49 22.599-32.783 31.83-45.195 44.88-45.832 13.05-0.63647 27.71-0.17274 88.186 18.924"/></g><g id="g15645" transform="matrix(.75439 0 0 1 1558.5 -6638.3)" fill-rule="evenodd"><rect id="rect15584" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="2" ry="1.8461" height="44.307" width="570" y="6558.3" x="100.71" fill="#4164bb"/><rect id="rect15331" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="2" ry="1.8461" height="44.307" width="570" y="6554.6" x="100.71" fill="#5276cf"/></g><text id="text15623-9" style="word-spacing:0px;letter-spacing:0px" font-weight="300" xml:space="preserve" font-size="22px" line-height="430.99999428%" y="-53.755863" x="1792.7805" font-family="&apos;Noto Sans CJK TC&apos;" fill="#ffffff"><tspan id="tspan15625-5" y="-53.755863" x="1792.7805"/></text><text id="text15657" style="word-spacing:0px;letter-spacing:0px" font-weight="300" xml:space="preserve" font-size="13px" line-height="430.99999428%" y="-3.7607465" x="1670.2437" font-family="&apos;Noto Sans CJK TC&apos;" fill="#828282"><tspan id="tspan15659" y="-3.7607465" x="1670.2437"/></text><g id="g34" fill-rule="evenodd"><path id="path4675" fill="#303030" d="m551.75 628.4c9.3003 4.1796 8.2375 11.558 2.1302 9.9581-6.1073-1.6003-33.792-9.1405-46.239-11.577-12.446-2.4363-34.904-3.0623-36.951-4.0165-2.0474-0.95416 0.93313-7.7247 5.491-7.3449 23.258 0.91012 59.905 6.0339 75.569 12.98z"/><path id="path4677" fill="#303030" d="m474.88 602.61c3.6488 0.63684 4.1169 1.3708 2.4115 5.2499-0.80967 1.8416-1.261 3.904-3.4715 3.7336-4.456-0.34344-16.578-1.2846-25.692-1.3764-9.1139-0.0918-23.83 1.217-25.307 0.79399-1.4771-0.42301-1.8834-4.9141 1.7769-6.7458 4.6221-1.3593 38.698-3.2021 50.281-1.6553z"/><path id="path4699" opacity=".384" fill="url(#linearGradient4701)" d="m475.53 611.7c-11.693-0.63604-8.4597-0.73151-44.068 54.448-6.5182 8.6489-22.874 37.231-36.865 35.326-6.7491-1.4177 15.436-67.299 22.724-75.767 11.112-12.911 19.255-16.122 58.209-14.007z"/><path id="path4703" fill="#303030" d="m84.068 628.4c-9.3003 4.1796-8.2375 11.558-2.1302 9.9581 6.1073-1.6003 33.792-9.1405 46.239-11.577 12.446-2.4363 34.904-3.0623 36.951-4.0165 2.0474-0.95416-0.93313-7.7247-5.491-7.3449-23.258 0.91012-59.905 6.0339-75.569 12.98z"/><path id="path4705" fill="#303030" d="m161.86 602.61c-3.6488 0.63684-4.1169 1.3708-2.4115 5.2499 0.80967 1.8416 1.261 3.904 3.4715 3.7336 4.456-0.34344 16.578-1.2846 25.692-1.3764 9.1139-0.0918 23.83 1.217 25.307 0.79399 1.4771-0.42301 1.8834-4.9141-1.7769-6.7458-4.6221-1.3593-38.698-3.2021-50.281-1.6553z"/><path id="path4711" opacity=".384" fill="url(#linearGradient4713)" d="m161.2 611.7c11.693-0.63604 8.4597-0.73151 44.068 54.448 6.5182 8.6489 22.874 37.231 36.865 35.326 6.7491-1.4177-15.436-67.299-22.724-75.767-11.112-12.911-19.255-16.122-58.209-14.007z"/><path id="path4717" opacity=".115" fill="url(#linearGradient4725)" d="m413.37 645.84c-9.0496 10.007-29.401 19.937-36.775 19.937h-52.205c-31.171 0-37.359 0.34506-47.75 0.51758-10.39 0.17253-18.682 0.65628-23.653-3.278-5.0513-3.9977-24-15.425-24-15.425 53.346 4.1464 144.49 4.3368 184.38-1.7523z"/></g></g><g id="layer1-0" fill-rule="evenodd" transform="translate(159.08 -720.76)"><g id="g4527-3" transform="translate(-961.22,330.69)"><ellipse id="circle4233-8" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="66.284" ry="66.279" cy="655.39" cx="1027.5" fill="#303030"/><ellipse id="circle4235-8" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="62.007" ry="62.003" cy="655.39" cx="1027.5" fill="#4c4c4c"/><ellipse id="circle4237-7" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="43.41" ry="43.408" cy="655.39" cx="1027.5" fill="#303030"/></g><g id="g4523-1" transform="translate(-961.22,330.69)"><ellipse id="circle4239-4" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="40.057" ry="40.054" cy="655.39" cx="1027.5" fill="#3b63c9"/><ellipse id="circle4243-3" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="36.23" ry="36.228" cy="655.39" cx="1027.5" fill="#5276cf"/></g><g id="g3506" transform="translate(-961.22,330.69)"><ellipse id="ellipse3508" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="66.284" ry="66.279" cy="655.39" cx="1027.5" fill="#303030"/><ellipse id="ellipse3510" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="62.007" ry="62.003" cy="655.39" cx="1027.5" fill="#4c4c4c"/><ellipse id="ellipse3512" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="43.41" ry="43.408" cy="655.39" cx="1027.5" fill="#303030"/></g></g><g id="layer1-7" fill-rule="evenodd" transform="translate(352.57 -719.72)"><g id="g4527-3-4" transform="translate(-961.22,330.69)"><ellipse id="circle4233-8-8" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="66.284" ry="66.279" cy="655.39" cx="1027.5" fill="#303030"/><ellipse id="circle4235-8-9" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="62.007" ry="62.003" cy="655.39" cx="1027.5" fill="#4c4c4c"/><ellipse id="circle4237-7-3" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="43.41" ry="43.408" cy="655.39" cx="1027.5" fill="#303030"/></g><g id="g4523-1-1" transform="translate(-961.22,330.69)"><ellipse id="circle4239-4-4" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="40.057" ry="40.054" cy="655.39" cx="1027.5" fill="#3b63c9"/><ellipse id="circle4243-3-5" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="36.23" ry="36.228" cy="655.39" cx="1027.5" fill="#5276cf"/></g><g id="g3506-2" transform="translate(-961.22,330.69)"><ellipse id="ellipse3508-1" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="66.284" ry="66.279" cy="655.39" cx="1027.5" fill="#303030"/><ellipse id="ellipse3510-1" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="62.007" ry="62.003" cy="655.39" cx="1027.5" fill="#4c4c4c"/><ellipse id="ellipse3512-4" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="43.41" ry="43.408" cy="655.39" cx="1027.5" fill="#303030"/></g></g></svg>';
var dpad_svg = '<svg id="svg3904" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="35.924mm" width="35.926mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 127.29808 127.28933"><metadata id="metadata3909"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" fill-rule="evenodd" transform="translate(0 -925.07)"><ellipse id="circle4330" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="63.649" ry="63.645" cy="988.72" cx="63.649" fill="#303030"/><ellipse id="circle4223" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="59.705" ry="59.701" cy="988.72" cx="63.649" fill="#4c4c4c"/></g></svg>';
var dpad_up_svg = '<svg id="svg3754" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="10.711mm" width="9.9653mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 35.3101 37.950677"><metadata id="metadata3759"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1014.4)"><path id="path4326" stroke-linejoin="round" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" d="m34.81 1017.1c-15.254-3.8172-24.634-1.7612-34.31 0v16.247h0.015c-0.013 0.097-0.013 0.1951-0.015 0.2928 0.0006 9.4753 7.6813 18.256 17.156 18.256 9.4739-0.0005 17.154-8.7813 17.154-18.256 0-0.097-0.014-0.1952-0.014-0.2928h0.014z" fill-rule="evenodd" stroke="#4364b2" stroke-linecap="round" fill="#5276cf"/></g></svg>';
var dpad_right_svg = '<svg id="svg3790" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="9.9646mm" width="10.711mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 37.953175 35.3077"><metadata id="metadata3795"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1017.1)"><path id="path4324" stroke-linejoin="round" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" d="m35.298 1017.6c3.8175 15.253 1.7611 24.633 0 34.308h-16.248v-0.015c-0.098 0.01-0.1952 0.01-0.2928 0.015-9.476-0.0006-18.258-7.6807-18.257-17.154 0.0005-9.4733 8.7818-17.153 18.257-17.153 0.098 0 0.1952 0.01 0.2928 0.011v-0.011z" fill-rule="evenodd" stroke="#4364b2" stroke-linecap="round" fill="#5276cf"/></g></svg>';
var dpad_down_svg = '<svg id="svg3754" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="10.711mm" width="9.9653mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 35.3101 37.950677"><metadata id="metadata3759"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1014.4)"><path id="path4328" stroke-linejoin="round" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" d="m34.81 1049.7c-15.254 3.8172-24.634 1.7612-34.31 0v-16.247h0.015c-0.013-0.097-0.013-0.1951-0.015-0.2928 0.0006-9.4753 7.6813-18.256 17.156-18.256 9.4739 0.0005 17.154 8.7813 17.154 18.256 0 0.097-0.014 0.1952-0.014 0.2928h0.014z" fill-rule="evenodd" stroke="#4364b2" stroke-linecap="round" fill="#5276cf"/></g></svg>';
var dpad_left_svg = '<svg id="svg3790" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="9.9646mm" width="10.711mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 37.953175 35.3077"><metadata id="metadata3795"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1017.1)"><path id="path4324" stroke-linejoin="round" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" d="m2.6552 1051.9c-3.8175-15.253-1.7611-24.633 0-34.308h16.248v0.015c0.098-0.01 0.1952-0.01 0.2928-0.015 9.476 0.0006 18.258 7.6807 18.257 17.154-0.0005 9.4733-8.7818 17.153-18.257 17.153-0.098 0-0.1952-0.01-0.2928-0.011v0.011z" fill-rule="evenodd" stroke="#4364b2" stroke-linecap="round" fill="#5276cf"/></g></svg>';
var face_btn_svg = '<svg id="svg3548" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="13.417mm" width="13.418mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 47.543997 47.542"><metadata id="metadata3553"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1004.8)"><ellipse id="circle4271" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="23.772" ry="23.771" cy="1028.6" cx="23.772" fill="#303030"/><ellipse id="circle4273" stroke-linejoin="round" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" stroke-linecap="round" rx="18.668" ry="18.667" stroke="#3b63c9" cy="1028.6" cx="23.772" fill="#5276cf"/></g></svg>';
var analog_btn_svg = '<svg id="svg3461" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="22.608mm" width="22.61mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 80.114398 80.108405"><metadata id="metadata3466"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(.0000019915 -972.25)"><g id="g3514-7" fill-rule="evenodd" transform="translate(-987.45 356.91)"><ellipse id="ellipse3516-7" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="40.057" ry="40.054" cy="655.39" cx="1027.5" fill="#3b63c9"/><ellipse id="ellipse3518-7" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="36.23" ry="36.228" cy="655.39" cx="1027.5" fill="#5276cf"/></g></g></svg>';
var start_btn_svg = '<svg id="svg3699" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="9.2811mm" width="9.2817mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 32.8879 32.88565"><metadata id="metadata3704"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" fill-rule="evenodd" transform="translate(0 -1019.5)"><ellipse id="ellipse4575" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="16.444" ry="16.443" cy="1035.9" cx="16.444" fill="#2e2e2e"/><ellipse id="ellipse4577" stroke-linejoin="round" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" stroke-linecap="round" rx="15.112" ry="15.11" stroke="#4364b2" cy="1035.9" cx="16.444" fill="#5276cf"/><ellipse id="ellipse4579" style="color-rendering:auto;color:#000000;isolation:auto;mix-blend-mode:normal;shape-rendering:auto;solid-color:#000000;image-rendering:auto" rx="11.867" ry="11.866" cy="1035.9" cx="16.444" fill="#434343"/></g></svg>';
var trigger_btn_svg = '<svg id="svg3560" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="4.7796mm" width="13.57mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 48.082162 16.935645"><metadata id="metadata3565"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1035.4)"><path id="path4727" d="m42.857 1052.2c4.7071 0.4081 4.7981 0.6563 5.1414-4.9139 0.16344-2.6517 0.16699-6.1108-0.72615-8.0342-0.59471-1.2808-1.7793-2.049-3.7642-2.4662-2.5264-0.531-16.253-1.4345-26.685-1.3241-15.118 0.16-15.362 1.4769-15.855 4.1522-0.35071 1.9018-0.5016 3.5056-0.74837 5.5967-0.55261 7.0693-0.44908 7.0921 5.0452 6.5411 11.661-1.1062 25.929-0.7359 37.592 0.4484z" fill-rule="evenodd" fill="#5276cf"/></g></svg>';
var bumper_left_svg = '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="21.241671mm" height="8.8544388mm" viewBox="0 0 75.265762 31.373996" id="svg3447" version="1.1" inkscape:version="0.91 r13725" sodipodi:docname="l1.svg"><defs id="defs3449" /><sodipodi:namedview id="base" pagecolor="#ffffff" bordercolor="#666666" borderopacity="1.0" inkscape:pageopacity="0.0" inkscape:pageshadow="2" inkscape:zoom="1.4" inkscape:cx="-254.57869" inkscape:cy="228.81952" inkscape:document-units="px" inkscape:current-layer="layer1" showgrid="false" fit-margin-top="0" fit-margin-left="0" fit-margin-right="0" fit-margin-bottom="0" inkscape:window-width="1920" inkscape:window-height="1134" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" /><metadata id="metadata3452"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata><g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1" transform="translate(1.5000945e-8,-1020.9882)"><path style="fill:#5276cf;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:0.99999994px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1" d="m 11.026383,1051.1651 c -7.4440599,1.9144 -7.5133499,2.2466 -9.7963799,-4.4934 -1.81058997,-5.3452 -2.44278,-8.8152 4.01547,-12.116 2.74038,-1.4007 13.7365799,-5.877 38.4768299,-10.72 24.26031,-4.749 25.16653,-2.7967 26.79132,0.3418 1.15503,2.2311 1.8961,4.1561 2.94279,6.651 3.08552,8.5188 2.92609,8.5778 -6.08214,9.5501 -19.09891,2.1414 -37.95723,5.8307 -56.34789,10.7865 z" id="path4289" inkscape:connector-curvature="0" sodipodi:nodetypes="cssssccc" /></g></svg>';
var bumper_right_svg = '<svg id="svg3447" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="8.8544mm" width="21.242mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 75.265762 31.373996"><metadata id="metadata3452"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(1.5001e-8 -1021)"><path id="path4715" d="m64.239 1051.2c7.4441 1.9144 7.5134 2.2466 9.7964-4.4934 1.8106-5.3452 2.4428-8.8152-4.0155-12.116-2.7404-1.4007-13.737-5.877-38.477-10.72-24.26-4.749-25.167-2.7967-26.791 0.3418-1.155 2.2311-1.8961 4.1561-2.9428 6.651-3.0855 8.5188-2.9261 8.5778 6.0822 9.5501 19.099 2.1414 37.957 5.8307 56.348 10.786z" fill-rule="evenodd" fill="#5276cf"/></g></svg>';
var main_svg = '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="24.603382mm" height="24.601696mm" viewBox="0 0 87.177338 87.171363" id="svg3640" version="1.1" inkscape:version="0.91 r13725" sodipodi:docname="main.svg"><defs id="defs3642" /><sodipodi:namedview id="base" pagecolor="#ffffff" bordercolor="#666666" borderopacity="1.0" inkscape:pageopacity="0.0" inkscape:pageshadow="2" inkscape:zoom="1.979899" inkscape:cx="61.113463" inkscape:cy="69.71796" inkscape:document-units="px" inkscape:current-layer="layer1" showgrid="false" fit-margin-top="0" fit-margin-left="0" fit-margin-right="0" fit-margin-bottom="0" inkscape:window-width="1920" inkscape:window-height="1134" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" /><metadata id="metadata3645"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata><g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1" transform="translate(0,-965.19093)"><ellipse ry="43.585682" rx="43.588669" style="color:#000000;clip-rule:nonzero;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:#000000;solid-opacity:1;fill:#2e2e2e;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:0.99999994;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto;enable-background:accumulate" id="ellipse4372" cx="43.588669" cy="1008.7766" /><ellipse cy="1008.7766" cx="43.588669" id="circle4239-1" style="color:#000000;clip-rule:nonzero;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:#000000;solid-opacity:1;fill:#5276cf;fill-opacity:1;fill-rule:evenodd;stroke:#4364b2;stroke-width:0.99999994;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto;enable-background:accumulate" rx="40.056705" ry="40.053959" /><ellipse style="color:#000000;clip-rule:nonzero;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:#000000;solid-opacity:1;fill:#434343;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:0.99999994;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto;enable-background:accumulate" id="circle4243-0" cx="43.588669" cy="1008.7766" rx="31.455994" ry="31.453836" /></g></svg>';

var axis_setting_svg = '<svg id="svg3407" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="41.787mm" width="41.786mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 148.0624 148.06251"><metadata id="metadata3412"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -904.3)" fill="#e6e6e6"><path id="rect4545" d="m74.031 904.3-14.469 22.156h8.0313v8.2187h12.875v-8.2187h8.0625l-14.5-22.156z"/><path id="rect4603" d="m125.94 963.86v8.0313h-8.25v12.906h8.25v8.0313l22.125-14.5-22.125-14.469z"/><path id="rect4609" d="m67.594 1022v8.25h-8.0313l14.469 22.125 14.5-22.125h-8.0625v-8.25h-12.875z"/><path id="rect4615" d="m22.156 963.86-22.156 14.47l22.156 14.5v-8.2188h8.2188v-12.906h-8.2188v-7.8438z"/><path id="path4619" style="color:#000000;text-indent:0;block-progression:tb;text-decoration-line:none;text-transform:none" d="m54.393 924.58c-15.821 5.7885-28.404 18.385-34.188 34.219h11.156c4.6667-10.175 12.865-18.361 23.031-23.031v-11.188zm39.219 0.031v11.156c10.167 4.6713 18.361 12.86 23.031 23.031h11.156c-5.7846-15.821-18.379-28.393-34.188-34.188zm-73.375 73.438c5.7899 15.816 18.348 28.403 34.156 34.188v-11.156c-10.163-4.6691-18.364-12.861-23.031-23.031h-11.125zm96.406 0c-4.6712 10.167-12.868 18.361-23.031 23.031v11.125c15.796-5.7901 28.366-18.352 34.156-34.156h-11.125z"/></g></svg>';
// wheel
var wheel_svg = '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="112.08413mm" height="128.46834mm" viewBox="0 0 397.14849 455.20277" id="svg3440" version="1.1" inkscape:version="0.91 r13725" sodipodi:docname="wheel.svg"><defs id="defs3442" /><sodipodi:namedview id="base" pagecolor="#ffffff" bordercolor="#666666" borderopacity="1.0" inkscape:pageopacity="0.0" inkscape:pageshadow="2" inkscape:zoom="0.98994949" inkscape:cx="421.01508" inkscape:cy="52.510802" inkscape:document-units="px" inkscape:current-layer="g87" showgrid="false" fit-margin-top="0" fit-margin-left="0" fit-margin-right="0" fit-margin-bottom="0" inkscape:window-width="1920" inkscape:window-height="1134" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" /><metadata id="metadata3445"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title /></cc:Work></rdf:RDF></metadata><g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1" transform="translate(-2.3645008e-8,-597.15942)"><path inkscape:connector-curvature="0" style="fill:#4d4d4d;stroke:#6e6e6e;stroke-width:2.99125171;stroke-miterlimit:4;stroke-dasharray:none" id="path4140" d="m 307.84153,715.52552 c -4.35995,43.11849 -2.78952,86.66385 -15.90234,128.54337 -10.85452,25.86023 -13.33477,47.2976 6.91492,61.09536 7.23778,50.7442 78.38013,47.39232 82.20535,0 23.06079,-14.19054 13.49405,-42.79138 6.91492,-61.09536 -17.40045,-40.83001 -4.82581,-86.43019 -15.90235,-128.54337 -8.3177,-20.33228 -56.75348,-20.7661 -64.22927,0 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#cccccc;stroke:#1a1a1a;stroke-width:2.09465766;stroke-miterlimit:4;stroke-dasharray:none" id="path4266" d="m 313.11812,724.1957 -3.84514,68.80568 c 4.64168,13.40814 62.19981,10.8172 61.83082,0 l -3.84515,-68.80568 c -4.46942,-24.00369 -52.58756,-18.95946 -54.13979,0 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#353535;stroke:#2c2c2c;stroke-width:2.11880326;stroke-miterlimit:4;stroke-dasharray:none" id="path4156" d="m 304.91419,870.673 c -12.36924,67.40381 80.42804,69.69607 70.55134,0 -6.57605,-36.5947 -65.0964,-34.8253 -70.55134,0 z m 60.53812,3.9862 c 8.65841,48.24354 -57.58987,49.86644 -50.52489,0 4.7009,-26.27069 46.6394,-24.84292 50.52489,0 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#e6e6e6;stroke:#969696;stroke-width:2.99125171;stroke-miterlimit:4;stroke-dasharray:none" id="path4011" d="m 106.04576,696.97906 c -11.197076,4.25792 -17.123706,8.24834 -17.123706,8.24834 l -66.18493,16.33946 1.40291,30.64619 46.54715,-7.67623 c 17.00932,-1.6438 32.551896,8.94676 38.302026,23.34506 l 2.78663,65.4778 27.6363,0 2.78663,-65.4778 c 8.0428,-15.3291 20.46247,-27.10803 38.30202,-23.34506 l 46.54716,7.67623 1.40291,-30.64619 -66.18493,-16.33946 c 0,0 -5.92627,-3.99074 -17.12371,-8.24834 -13.45408,-4.31874 -26.62772,-4.20804 -39.08982,0 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#252525;stroke:#6e6e6e;stroke-width:2.99125171;stroke-miterlimit:4;stroke-dasharray:none" id="path2996" d="m 38.311064,931.09899 c -8.01574,5.05649 -22.76006,21.74743 -26.34852,58.0567 -4.1290804,35.18581 -4.8394604,60.59901 28.55878,61.68771 l 162.934726,0 c 39.19437,1.1693 30.46155,-41.5992 28.55878,-61.68771 -3.58839,-36.30927 -18.33277,-52.99983 -26.34851,-58.0567 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#373737;stroke:#6e6e6e;stroke-width:2.83429575;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none" id="path3019" d="m 26.230254,979.1291 c -11.50334,14.44882 -11.98241,47.3999 -0.33519,57.1202 l 191.802226,0 c 12.10111,-12.3068 9.93082,-46.99573 -0.33518,-57.1202 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#808080;stroke:#1a1a1a;stroke-width:2.14882827;stroke-linecap:square;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0" id="path4133" d="m 360.82498,854.6914 a 20.634815,21.265151 0 1 1 -41.269,0 20.634815,21.265151 0 1 1 41.269,0 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#333333;stroke:#000000;stroke-width:2.11880326;stroke-linecap:square;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0" id="path4280" d="m 351.64051,761.132 a 11.444622,11.75148 0 1 1 -22.88896,0 11.444622,11.75148 0 1 1 22.88896,0 z" stroke-miterlimit="4" /><path inkscape:connector-curvature="0" style="fill:#313131;stroke:#565656;stroke-width:2.93434715;stroke-linecap:square;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0" id="path3993" d="m 125.52855,598.62659 c -68.528026,0 -124.0613764,57.81925 -124.0613764,129.13695 0,71.31265 55.5370404,129.13696 124.0613764,129.13696 68.52804,0 124.07984,-57.81926 124.07984,-129.13696 0,-71.31264 -55.55611,-129.13695 -124.07984,-129.13695 z m -1.00095,23.63932 c 10.01261,0.0734 20.238,1.32074 28.95237,3.51006 11.62203,3.80301 21.53624,8.52304 31.01135,16.15381 26.21752,19.0207 43.36275,50.36277 43.36275,85.83029 0,58.01564 -45.80548,105.05244 -102.30928,105.05244 -56.500726,0 -102.309276,-47.03364 -102.309276,-105.05244 0,-32.14848 14.06783,-60.91918 36.22336,-80.19121 11.45168,-11.11714 23.14136,-17.13322 37.3943,-21.79731 7.855846,-2.48302 17.655666,-3.5835 27.668276,-3.51006 z" stroke-miterlimit="4" /><g style="stroke-miterlimit:4;stroke-dasharray:none" id="g4127" stroke-miterlimit="4" transform="matrix(0.61498728,0,0,0.63147657,-18.171616,453.28593)"><g id="g4111"><path style="fill:#808080;stroke:#373737;stroke-width:3.56837296" inkscape:connector-curvature="0" id="rect3040" d="m 110.97,771.16 31.694,4.8776 1.3007,44.257 -32.995,0 z" /><path style="fill:#b3b3b3;stroke:#565656;stroke-width:3.4000001;stroke-linecap:butt;stroke-linejoin:miter" inkscape:connector-curvature="0" id="path3024" d="m 96.83,686.82 58.353,-5.0761 c 15.608,27.569 6.8304,64.333 -5.0761,90.545 l -53.841,-2.538 z" /></g><g id="g4115" transform="translate(97.984785,0)"><path style="fill:#808080;stroke:#373737;stroke-width:3.56837296" inkscape:connector-curvature="0" id="path4117" d="m 110.97,771.16 31.694,4.8776 1.3007,44.257 -32.995,0 z" /><path style="fill:#b3b3b3;stroke:#565656;stroke-width:3.4000001;stroke-linecap:butt;stroke-linejoin:miter" inkscape:connector-curvature="0" id="path4119" d="m 96.83,686.82 58.353,-5.0761 c 15.608,27.569 6.8304,64.333 -5.0761,90.545 l -53.841,-2.538 z" /></g><g id="g4121" transform="translate(195.96959,0)"><path style="fill:#808080;stroke:#373737;stroke-width:3.56837296" inkscape:connector-curvature="0" id="path4123" d="m 110.97,771.16 31.694,4.8776 1.3007,44.257 -32.995,0 z" /><path style="fill:#b3b3b3;stroke:#565656;stroke-width:3.4000001;stroke-linecap:butt;stroke-linejoin:miter" inkscape:connector-curvature="0" id="path4125" d="m 96.83,686.82 58.353,-5.0761 c 15.608,27.569 6.8304,64.333 -5.0761,90.545 l -53.841,-2.538 z" /></g></g><g style="fill:#666666;stroke:#969696;stroke-width:3.99777174;stroke-miterlimit:4;stroke-dasharray:none" id="g4051" transform="translate(-42.878584,98.083591)" stroke-miterlimit="4"><g id="g4437" transform="matrix(0.74686368,0,0,0.74686368,-73.374214,285.30447)"><path inkscape:connector-curvature="0" id="rect4348" style="color:#000000;text-indent:0;text-transform:none;block-progression:tb;fill:#ffffff" d="m 567.31,584.22 0,42.25 0,3.4062 0,42.25 3.375,0 0,-42.25 27.062,0 0,42.25 3.375,0 0,-42.25 27.062,0 0,42.25 3.375,0 0,-42.25 27.062,0 0,42.25 3.4062,0 0,-43.969 0,-1.6875 -1.7188,0 -28.75,0 0,-42.25 -3.375,0 0,42.25 -27.062,0 0,-42.25 -3.375,0 0,42.25 -27.062,0 0,-42.25 -3.375,0 z" /><g style="fill:#a02c2c;stroke:#ffffff;stroke-width:3.4000001;stroke-linecap:square" id="g87" /></g></g></g></svg>';
var wheel_btn = '<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="5.4777083mm" height="5.5003009mm" viewBox="0 0 19.409203 19.489255" id="svg3402" version="1.1" inkscape:version="0.91 r13725" sodipodi:docname="wheel_btn.svg"><defs id="defs3404" /><sodipodi:namedview id="base" pagecolor="#ffffff" bordercolor="#666666" borderopacity="1.0" inkscape:pageopacity="0.0" inkscape:pageshadow="2" inkscape:zoom="22.4" inkscape:cx="4.7324003" inkscape:cy="15.245372" inkscape:document-units="px" inkscape:current-layer="layer1" showgrid="false" fit-margin-top="0" fit-margin-left="0" fit-margin-right="0" fit-margin-bottom="0" inkscape:window-width="1920" inkscape:window-height="1134" inkscape:window-x="0" inkscape:window-y="27" inkscape:window-maximized="1" /><metadata id="metadata3407"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata><g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1" transform="translate(8.5754969e-8,-1032.873)"><path inkscape:connector-curvature="0" style="fill:#5276cf;stroke:#000000;stroke-width:3.4000001;stroke-linecap:square;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;fill-opacity:1" id="path4272" d="m 17.709101,1042.6176 a 8.0046,8.0046 0 1 1 -16.0089998,0 8.0046,8.0046 0 1 1 16.0089998,0 z" stroke-miterlimit="4" /></g></svg>';
var wheel_right_svg = '<svg id="svg3400" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="10.507mm" width="15.1mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 53.504016 37.228838"><metadata id="metadata3405"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(-2.847e-7 -1015.1)"><path id="path4049" d="m26.584 1016.1c-12.631 0-23.15 9.858-25.478 22.922l50.705 12.18c0.47921-2.1565 0.73023-4.4099 0.73023-6.7204 0-15.677-11.621-28.382-25.957-28.382z" stroke="#5276cf" stroke-linecap="square" stroke-width="1.9247" fill="#666"/></g></svg>';
var wheel_left_svg = '<svg id="svg3400" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="10.507mm" width="15.1mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 53.504016 37.228838"><metadata id="metadata3405"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(-2.847e-7 -1015.1)"><path id="path4033" d="m26.92 1016.1c-14.337 0-25.957 12.707-25.957 28.382 0 2.3225 0.26742 4.5784 0.74876 6.7386l50.681-12.18c-2.321-13.072-12.841-22.944-25.476-22.944z" stroke="#5276cf" stroke-linecap="square" stroke-width="1.9247" fill="#666"/></g></svg>';

var pedal_svg = '<svg id="svg3386" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="12.859mm" width="5.2917mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 18.749999 45.562501"><metadata id="metadata3391"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1006.8)"><path id="rect4575" d="m9.3125 1006.8-9.3125 14.25h5.3125v17.094h-5.1875l9.3125 14.219 9.3125-14.219h-5.1562v-17.094h5.0312l-9.3125-14.25z" fill="#e6e6e6"/></g></svg>';
var wheel_settings_svg = '<svg id="svg3458" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="50.447mm" width="83.899mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 297.28131 178.75"><metadata id="metadata3463"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -873.61)" fill="#e6e6e6"><path id="path4535" style="color:#000000;text-indent:0;block-progression:tb;text-decoration-line:none;text-transform:none" d="m33.875 873.61-18.5 8.8125 5.0626 3.0625c-12.899 22.78-20.438 49.17-20.438 77.44 0 28.284 7.5315 54.691 20.438 77.469l-5.0626 3.0625 18.5 8.8125 0.6563-20.469-5.531 3.3c-12.002-21.2-18.937-45.8-18.937-72.18 0-26.362 6.9415-50.99 18.937-72.188l5.5313 3.3438-0.6563-20.469z"/><path id="path4551" style="color:#000000;text-indent:0;block-progression:tb;text-decoration-line:none;text-transform:none" d="m263.38 873.71-0.6562 20.469 5.5312-3.3438c11.996 21.198 18.969 45.825 18.969 72.188 0 26.371-6.9672 51.011-18.969 72.219l-5.5312-3.3437 0.6562 20.469 18.5-8.8125-5.0312-3.0625c12.906-22.778 20.438-49.184 20.438-77.469 0-28.275-7.5391-54.665-20.438-77.438l5.0312-3.0625-18.5-8.8125z"/></g></svg>';
var gearbox_hor_svg = '<svg id="svg3378" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="2.9016mm" width="9.2516mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 32.781198 10.281199"><metadata id="metadata3383"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1042.1)"><path id="rect4585" d="m32.781 1047.2-7.875-5.125v2.8437h-17.031v-2.8437l-7.875 5.1 7.875 5.1562v-2.8437h17.031v2.8437z" fill="#e6e6e6"/></g></svg>';
var gearbox_vert_svg = '<svg id="svg3378" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" height="9.2516mm" width="2.9016mm" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" viewBox="0 0 10.281248 32.7812"><metadata id="metadata3383"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"/><dc:title/></cc:Work></rdf:RDF></metadata><g id="layer1" transform="translate(0 -1019.6)"><path id="rect4585" d="m5.125 1019.6-5.125 7.9h2.8437v17.031h-2.8437l5.125 7.875 5.1562-7.875h-2.8438v-17.031h2.8438z" fill="#e6e6e6"/></g></svg>';

var _svg = [];
var _selected_gamepad_num = -1;
var _selected_btn = null;
var _mode = VIEWER_MODE;
var _main_element = null;
var _device_elem = null;
var _gamepad_elem = null;
var _type_wheel_elem = null;
var _type_pad_elem = null;
var _device_id_label = null;
var _tmp_gamepads = [];
var _prefix = "";
var _elems = [];
var _axis_elems = [];
var _axis_settings_elems = [];
var _is_pad_mode = true;

var _axes_prev_val = {};
_axes_prev_val[m_input.GMPD_AXIS_0] = -2;
_axes_prev_val[m_input.GMPD_AXIS_1] = -2;
_axes_prev_val[m_input.GMPD_AXIS_2] = -2;
_axes_prev_val[m_input.GMPD_AXIS_3] = -2;
_axes_prev_val[m_input.GMPD_AXIS_4] = -2;
_axes_prev_val[m_input.GMPD_AXIS_5] = -2;
_axes_prev_val[m_input.GMPD_AXIS_6] = -2;
_axes_prev_val[m_input.GMPD_AXIS_7] = -2;
_axes_prev_val[m_input.GMPD_AXIS_8] = -2;
_axes_prev_val[m_input.GMPD_AXIS_9] = -2;
_axes_prev_val[m_input.GMPD_AXIS_10] = -2;
_axes_prev_val[m_input.GMPD_AXIS_11] = -2;


/**
 * Show a gamepad configurator.
 * @method module:gp_conf.show
 */
exports.show = function() {

    // creating interface elements
    var main_div = document.createElement("div");
    _main_element = main_div;
    main_div.style.cssText =
        "position: absolute;" +
        "width: 720px;" +
        "height: 750px;" +
        "top: 50%;" +
        "left: 50%;" +
        "-moz-transform: translateY(-50%) translateX(-50%);" +
        "-ms-transform: translateY(-50%) translateX(-50%);" +
        "-webkit-transform: translateY(-50%) translateX(-50%);" +
        "transform: translateY(-50%) translateX(-50%);" +
        "background-color: black;" +
        "border: 4px solid white;" +
        "border-radius: 35px;" +
        "box-shadow: 0px 0px 20px 0px rgba(50, 50, 50, 1);";
    m_cont.insert_to_container(main_div, "LAST");

    create_pad_interface(main_div);

    //creating another interface elements
    var gamepad_data_cnt = document.createElement("div");
    gamepad_data_cnt.style.cssText =
        "position: absolute;" +
        "width: 637px;" +
        "top: 0px;" +
        "font-family: sans-serif;" +
        "text-align: center;" +
        "margin-top: 40px;" +
        "-moz-transform: translateX(-50%);" +
        "-ms-transform: translateX(-50%);" +
        "-webkit-transform: translateX(-50%);" +
        "transform: translateX(-50%);" +
        "left: 50%;";

    var main_label = document.createElement("div");
    main_label.innerHTML = MAIN_DEVICE_CAPTION;
    main_label.style.cssText =
        "color: #fff;" +
        "display: inline-block;";
    gamepad_data_cnt.appendChild(main_label);

    for (var j = 0; j < 4; j++) {
        var sensors = create_sensors(j);

        var logic_func = function() {
            return true;
        }
        var sensor_cb = function(obj, id, pulse) {
            if (id != _selected_gamepad_num)
                return;

            for (var i = 0; i < _elems.length; i++) {
                var elem = _elems[i];
                set_btn_state(elem, m_ctrl.get_sensor_value(obj, id, i), i);
            }
        }
        m_ctrl.create_sensor_manifold(null, j, m_ctrl.CT_CONTINUOUS,
                sensors, logic_func, sensor_cb);
    }

    var gamepads = get_gamepads();
    if (gamepads.length > 0)
        _selected_gamepad_num = 0;
    var gamepads_data = [];
    var gamepads_data_container = document.createElement("div");
    gamepads_data_container.style.cssText =
        "margin-top: 20px;";
    for (var i = 0; i < 4; i++) {
        var gamepad_data_elem = create_device_icon_elem(i);
        if (i == _selected_gamepad_num) {
            gamepad_data_elem.style.backgroundColor = "green";
            _gamepad_elem = gamepad_data_elem;
        }
        set_gmpd_config(i);
        gamepads_data_container.appendChild(gamepad_data_elem);
        gamepad_data_elem.setAttribute("data-device_type", "PAD");
        gamepads_data.push(gamepad_data_elem);

        var click_cb = function(e) {
            var gamepads = get_gamepads();
            var elem = e.target;
            for (var j = 0; j < gamepads.length; j++) {
                if (gamepads_data[j] == elem) {
                    _selected_gamepad_num = j;
                    _gamepad_elem = elem;
                    set_gmpd_config(_selected_gamepad_num);
                    change_device(elem.dataset.device_type);
                }
            }
        }

        gamepad_data_elem.addEventListener("click", click_cb, false);
    }
    gamepad_data_cnt.appendChild(gamepads_data_container);

    _device_id_label = document.createElement("label");
    _device_id_label.style.cssText =
        "position: relative;" +
        "display: block;" +
        "color: white;";
    gamepad_data_cnt.appendChild(_device_id_label);

    var type_and_action_container = document.createElement("div");
    type_and_action_container.style.cssText =
        "margin-top: 20px;";

    var select_pad_elem = append_type_elem(type_and_action_container, "Pad");
    var select_wheel_elem = append_type_elem(type_and_action_container, "Wheel");
    select_pad_elem.setAttribute("checked", "true");

    select_pad_elem.onchange = function() {
        change_device("PAD");
        if (_gamepad_elem)
            _gamepad_elem.setAttribute("data-device_type", "PAD");
    }
    select_wheel_elem.onchange = function() {
        change_device("WHEEL");
        if (_gamepad_elem)
            _gamepad_elem.setAttribute("data-device_type", "WHEEL");
    }
    select_pad_elem.setAttribute("id", "test")
    _type_pad_elem = select_pad_elem;
    _type_wheel_elem = select_wheel_elem;

    var action_label = document.createElement("label");
    action_label.style.cssText +=
        "color: #fff;" +
        "display: block;";
    type_and_action_container.appendChild(action_label);
    action_label.textContent = SELECT_BTN_CAPTION;
    action_label.setAttribute("id", "action_label");

    gamepad_data_cnt.appendChild(type_and_action_container);

    main_div.appendChild(gamepad_data_cnt);

    var e_s = m_ctrl.create_elapsed_sensor();

    function e_sensor_cb(obj, id, pulse) {
        var gamepads = get_gamepads();
        var num = gamepads.length;
        if (_selected_gamepad_num == -1 && gamepads.length) {
            _selected_gamepad_num = gamepads[0].index;
            _gamepad_elem = gamepads_data[_selected_gamepad_num];
        }
        for (var i = 0; i < gamepads_data.length; i++)
            if (i < num) {
                gamepads_data[i].textContent = gamepads[i].index;
                if (gamepads_data[i] == _gamepad_elem) {
                    gamepads_data[i].style.backgroundColor = "green";
                    _device_id_label.textContent = "Selected device: "
                            + gamepads[i].index + ". Data: " + gamepads[i].id;
                } else
                    gamepads_data[i].style.backgroundColor = "blue";
            } else {
                gamepads_data[i].style.backgroundColor = "black";
            }
        if (!num) {
            _selected_gamepad_num = -1;
            _device_id_label.textContent = "";
        }
    }

    m_ctrl.create_sensor_manifold(null, "UPDATE_GAMEPAD_DATA", m_ctrl.CT_CONTINUOUS,
            [e_s], logic_func, e_sensor_cb);


    for (var j = 0; j < 4; j++) {
        var sensors = create_axis_sensors(j);

        var logic_func = function() {
            return true;
        }
        var sensor_cb = function(obj, id, pulse) {
            if (id != "AXES" + _selected_gamepad_num)
                return;

            for (var i = 0; i < _axis_elems.length; i=i+2) {
                var elem = _axis_elems[i];
                set_axis_state(elem, obj, id, i);
            }
            if (_is_pad_mode)
                for (var i = 0; i < 12; i=i+2)
                    change_dual_axis_setting_color(obj, id, i);
            else
                for (var i = 0; i < 12; i++)
                    change_single_axis_setting_color(obj, id, i);
        }
        m_ctrl.create_sensor_manifold(null, "AXES" + j, m_ctrl.CT_CONTINUOUS,
                sensors, logic_func, sensor_cb);
    }

    zoom_main_div();
    window.addEventListener("resize", zoom_main_div);
}

function set_axis_state(elem, obj, id, num) {
    var x = m_ctrl.get_sensor_value(obj, id, num) * AXIS_STEP;
    var y = m_ctrl.get_sensor_value(obj, id, num + 1) * AXIS_STEP;
    elem.style.transform = "translate3d(" + x + "px, " + y + "px, 0px) rotate(" 
                + 0 + "rad)";
}

function change_dual_axis_setting_color(obj, id, num) {

    if (num + 1 > _axis_settings_elems.length * 2)
        return;

    var x = m_ctrl.get_sensor_value(obj, id, num);
    var y = m_ctrl.get_sensor_value(obj, id, num + 1);

    if (_axes_prev_val[num] > -2) {
        var delta_x = x - _axes_prev_val[num];
        var delta_y = y - _axes_prev_val[num + 1];
        var elem = _axis_settings_elems[Math.floor(num / 2)];
        var svg_id = elem.dataset.svgid;
        if (_mode == VIEWER_MODE) {
            if (delta_x || delta_y)
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_id].replace(GREY_COLOR,
                        GREEN_COLOR))  + "')";
            else
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_id])  + "')";
        } else if (_mode == AXIS_EDIT_MODE) {
            var moved_axis = m_input.get_moved_gmpd_axis(_selected_gamepad_num);
            if (moved_axis >= 0) {
                if (moved_axis % 2 != 0)
                    moved_axis--;
                _mode = VIEWER_MODE;
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_id])  + "')";
                var sel_axis = parseFloat(_selected_btn.dataset.key);
                m_input.set_gamepad_key(_selected_gamepad_num, sel_axis, moved_axis);
                m_input.set_gamepad_key(_selected_gamepad_num, sel_axis + 1, moved_axis + 1);
                _selected_btn = null;
                document.getElementById("action_label").textContent =
                            SELECT_BTN_CAPTION;
            }
        }
    }

    _axes_prev_val[num] = x;
    _axes_prev_val[num + 1] = y;
}

function change_single_axis_setting_color(obj, id, num) {
    if (num >= _axis_settings_elems.length)
        return;

    var val = m_ctrl.get_sensor_value(obj, id, num);
    if (_axes_prev_val[num] > -2) {
        var delta_val = val - _axes_prev_val[num];
        var elem = _axis_settings_elems[num];
        var svg_id = elem.dataset.svgid;
        if (_mode == VIEWER_MODE) {
            if (delta_val)
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_id].replace(GREY_COLOR,
                        GREEN_COLOR))  + "')";
            else
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_id])  + "')";
        } else if (_mode == AXIS_EDIT_MODE) {
            var moved_axis = m_input.get_moved_gmpd_axis(_selected_gamepad_num);
            if (moved_axis >= 0) {
                _mode = VIEWER_MODE;
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_id])  + "')";
                var sel_axis = parseFloat(_selected_btn.dataset.key);
                m_input.set_gamepad_key(_selected_gamepad_num, sel_axis, moved_axis);
                _selected_btn = null;
                document.getElementById("action_label").textContent =
                            SELECT_BTN_CAPTION;
            }
        }
    }

    _axes_prev_val[num] = val;
}

function set_btn_state(elem, pressed, num) {
    if (_mode == VIEWER_MODE) {
        if (pressed && elem.dataset.colorstate == "B") {
            var svg = _svg[num];
            elem.style.backgroundImage = SVG_BASE64 + btoa(svg.replace(BLUE_COLOR_REGEXP,
                    GREEN_COLOR))  + "')";
            elem.setAttribute("data-colorstate", "G");
        }
        if (!pressed && elem.dataset.colorstate != "B") {
            var svg = _svg[num];
            elem.style.backgroundImage = SVG_BASE64 + btoa(svg)  + "')";
            elem.setAttribute("data-colorstate", "B");
        }
    } else {
        var pressed_btn_key = m_input.get_pressed_gmpd_btn(_selected_gamepad_num);
        if (pressed_btn_key >= 0 && _selected_btn && _mode == BTN_EDIT_MODE) {
            var red_btn_val = _selected_btn.dataset.key;
            m_input.set_gamepad_key(_selected_gamepad_num, red_btn_val,
                    pressed_btn_key);
            save_config_to_local_mem(red_btn_val, pressed_btn_key);
            _selected_btn = null;
            document.getElementById("action_label").textContent = SELECT_BTN_CAPTION;
            _mode = VIEWER_MODE;
        }
    }
}
/**
 * Hide a gamepad configurator.
 * @method module:gp_conf.hide
 */
exports.hide = function() {
    _mode = VIEWER_MODE;
    _selected_gamepad_num = -1;
    _gamepad_elem = null;
    _selected_btn = null;
    _type_wheel_elem = null;
    _type_pad_elem = null;
    _axis_elems.length = 0;
    _elems.length = 0;
    _axis_settings_elems.length = 0;

    var main_container = m_cont.get_container();
    main_container.removeChild(_main_element);
    _main_element = null;
    m_ctrl.remove_sensor_manifold(null, "UPDATE_GAMEPAD_DATA");
    for (var i = 0; i < 4; i++) {
        m_ctrl.remove_sensor_manifold(null, i);
        m_ctrl.remove_sensor_manifold(null, "AXES" + i);
    }

    window.removeEventListener("resize", zoom_main_div);
}

function get_gamepads() {
    _tmp_gamepads.length = 0;
    var gamepads = navigator.getGamepads ? navigator.getGamepads() :
            (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    for (var i = 0; i < gamepads.length; i++)
        if (gamepads[i])
            _tmp_gamepads.push(gamepads[i]);
    return _tmp_gamepads;
}

function save_config_to_local_mem(red_btn_val, pressed_btn_key) {
    var gmpd_stngs_str = m_storage.get(_selected_gamepad_num + "_gmpd_stngs", "b4w") || "{}";
    var gmpd_stngs = JSON.parse(gmpd_stngs_str);
    gmpd_stngs[red_btn_val] = pressed_btn_key;
    m_storage.set(_selected_gamepad_num + "_gmpd_stngs", JSON.stringify(gmpd_stngs), "b4w");
}

function init_gmpd_stngs(gamepad_id) {
    var settings = JSON.stringify(GMPD_DFLT_STNGS);
    m_storage.set(gamepad_id + "_gmpd_stngs", settings, "b4w");
}

function apply_settings(settings, gamepad_id) {
    for (var button in settings)
        m_input.set_gamepad_key(gamepad_id, button,
                    settings[button]);
}

function set_gmpd_config(gamepad_id) {
    var gmpd_stngs = m_storage.get(gamepad_id + "_gmpd_stngs", "b4w");
    if (gmpd_stngs) {
        apply_settings(JSON.parse(gmpd_stngs), gamepad_id);
    } else {
        init_gmpd_stngs(gamepad_id);
    }
}

/**
 * Update gamepad device config without showing configurator
 * @method module:gp_conf.update
 */
exports.update = function() {
   for(var i = 0; i < 4; i++)
       set_gmpd_config(i);
}

function create_pad_interface(main_div) {

    _is_pad_mode = true;

    var gamepad_elem = document.createElement("div");
    var dpad_group = document.createElement("div");
    var dpad_up_elem = document.createElement("div");
    var dpad_right_elem = document.createElement("div");
    var dpad_down_elem = document.createElement("div");
    var dpad_left_elem = document.createElement("div");
    var face_group = document.createElement("div");
    var face_up_elem = document.createElement("div");
    var face_right_elem = document.createElement("div");
    var face_down_elem = document.createElement("div");
    var face_left_elem = document.createElement("div");
    var analog_left = document.createElement("div");
    var analog_right = document.createElement("div");
    var select_btn = document.createElement("div");
    var start_btn = document.createElement("div");
    var left_bumper = document.createElement("div");
    var right_bumper = document.createElement("div");
    var right_trigger = document.createElement("div");
    var left_trigger = document.createElement("div");
    var main_btn = document.createElement("div");

    var left_axis_sittings = document.createElement("div");
    var right_axis_sittings = document.createElement("div");

    _device_elem = gamepad_elem;

    //setting styles

    gamepad_elem.style.cssText =
        "position: absolute;" +
        "height: auto;" +
        "background-image: " + SVG_BASE64 + btoa(gamepad_svg) + "');" +
        "width: 637px;" +
        "height: 455px;" +
        "background-size: 100% 100%;" +
        "left: 50%;" +
        "margin-bottom: 40px;" +
        "-moz-transform: translateX(-50%);" +
        "-ms-transform: translateX(-50%);" +
        "-webkit-transform: translateX(-50%);" +
        "bottom: 0px;";
    
    dpad_group.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(dpad_svg) + "');" +
        "position: absolute;" + 
        "top: 47px;" +
        "left: 65px;" +
        "width: 135px;" +
        "height: 135px;";

    dpad_up_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(dpad_up_svg) + "');" +
        "width: 36px;" +
        "height: 38px;" +
        "left: 49px;" +
        "top: 8px;" +
        "position: absolute;";

    dpad_right_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(dpad_right_svg) + "');" +
        "width: 38px;" +
        "height: 36px;" +
        "top: 47px;" +
        "left: 84px;" +
        "position: absolute;";

    dpad_down_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(dpad_down_svg) + "');" +
        "width: 36px;" +
        "height: 38px;" +
        "bottom: 11px;" +
        "left: 51px;" +
        "position: absolute;";

    dpad_left_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(dpad_left_svg) + "');" +
        "width: 38px;" +
        "height: 36px;" +
        "top: 47px;" +
        "left: 13px;" +
        "position: absolute;";

    face_group.style.cssText =
        "position: absolute;" +
        "top: 55px;" +
        "left: 434px;" +
        "width: 150px;" +
        "height: 150px;";
    
    face_up_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(face_btn_svg) + "');" +
        "width: 50px;" +
        "height: 50px;" +
        "left: 53px;" +
        "top: 0px;" +
        "position: absolute;";

    face_right_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(face_btn_svg) + "');" +
        "width: 50px;" +
        "height: 50px;" +
        "left: 107px;" +
        "top: 51px;" +
        "position: absolute;";

    face_down_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(face_btn_svg) + "');" +
        "width: 50px;" +
        "height: 50px;" +
        "left: 53px;" +
        "bottom: 0px;" +
        "position: absolute;";

    face_left_elem.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(face_btn_svg) + "');" +
        "width: 50px;" +
        "height: 50px;" +
        "top: 51px;" +
        "position: absolute;";

    analog_left.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(analog_btn_svg) + "');" +
        "position: absolute;" +
        "top: 222px;" +
        "left: 183px;" +
        "width: 85px;" +
        "height: 85px;";

    analog_right.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(analog_btn_svg) + "');" +
        "position: absolute;" +
        "top: 223px;" +
        "left: 376px;" +
        "width: 85px;" +
        "height: 85px;";

    select_btn.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(start_btn_svg) + "');" +
        "position: absolute;" +
        "top: 76px;" +
        "left: 227px;" +
        "width: 34px;" +
        "height: 34px;";

    start_btn.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(start_btn_svg) + "');" +
        "position: absolute;" +
        "top: 76px;" +
        "left: 376px;" +
        "width: 34px;" +
        "height: 34px;";

    left_bumper.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(bumper_left_svg) + "');" +
        "position: absolute;" +
        "top: 4px;" +
        "left: 78px;" +
        "width: 79px;" +
        "height: 33px;";

    right_bumper.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(bumper_right_svg) + "');" +
        "position: absolute;" +
        "top: 4px;" +
        "left: 477px;" +
        "width: 79px;" +
        "height: 33px;";

    right_trigger.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(trigger_btn_svg) + "');" +
        "position: absolute;" +
        "top: -7px;" +
        "left: 425px;" +
        "width: 50px;" +
        "height: 17px;";

    left_trigger.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(trigger_btn_svg) + "');" +
        "position: absolute;" +
        "top: -7px;" +
        "left: 164px;" +
        "width: 50px;" +
        "height: 17px;";

    main_btn.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(main_svg) + "');" +
        "position: absolute;" +
        "top: 68px;" +
        "left: 274px;" +
        "width: 92px;" +
        "height: 92px;";

    left_axis_sittings.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(axis_setting_svg) + "');" +
        "position: absolute;" +
        "top: 186px;" +
        "left: 148px;" +
        "width: 157px;" +
        "height: 157px;";

    right_axis_sittings.style.cssText =
        "background-image: " + SVG_BASE64 + btoa(axis_setting_svg) + "');" +
        "position: absolute;" +
        "top: 187px;" +
        "left: 339px;" +
        "width: 157px;" +
        "height: 157px;";

    //settings parents
    gamepad_elem.appendChild(left_axis_sittings);
    gamepad_elem.appendChild(right_axis_sittings);

    dpad_group.appendChild(dpad_up_elem);
    dpad_group.appendChild(dpad_right_elem);
    dpad_group.appendChild(dpad_down_elem);
    dpad_group.appendChild(dpad_left_elem);
    gamepad_elem.appendChild(dpad_group);
    face_group.appendChild(face_up_elem);
    face_group.appendChild(face_right_elem);
    face_group.appendChild(face_down_elem);
    face_group.appendChild(face_left_elem);
    gamepad_elem.appendChild(face_group);
    gamepad_elem.appendChild(analog_left);
    gamepad_elem.appendChild(analog_right);
    gamepad_elem.appendChild(select_btn);
    gamepad_elem.appendChild(start_btn);
    gamepad_elem.appendChild(left_bumper);
    gamepad_elem.appendChild(right_bumper);
    gamepad_elem.appendChild(right_trigger);
    main_div.appendChild(gamepad_elem);
    gamepad_elem.appendChild(left_trigger);
    gamepad_elem.appendChild(main_btn);

    _elems.length = 0;
    _svg.length = 0;
    _axis_elems.length = 0;
    _axis_settings_elems.length = 0;
    _elems.push(face_down_elem, face_right_elem, face_left_elem, face_up_elem,
            left_bumper, right_bumper, left_trigger, right_trigger,
            select_btn, start_btn, analog_left, analog_right,
            dpad_up_elem, dpad_down_elem, dpad_left_elem, dpad_right_elem,
            main_btn);
    _svg.push(face_btn_svg, face_btn_svg, face_btn_svg, face_btn_svg,
        bumper_left_svg, bumper_right_svg, trigger_btn_svg, trigger_btn_svg,
        start_btn_svg, start_btn_svg, analog_btn_svg, analog_btn_svg, 
        dpad_up_svg, dpad_down_svg, dpad_left_svg, dpad_right_svg, main_svg);
    _axis_elems.push(analog_left, analog_left, analog_right, analog_right);
    _axis_settings_elems.push(left_axis_sittings, right_axis_sittings);

    //setting attributes
    for (var i = 0; i < _elems.length; i++) {
        _elems[i].setAttribute("id", "pad_btn_" + i);
        _elems[i].setAttribute("data-colorstate", "B");
        _elems[i].setAttribute("data-key", i);
        _elems[i].setAttribute("data-svgid", i);
    }
    left_axis_sittings.setAttribute("id", "pad_left_axis");
    left_axis_sittings.setAttribute("data-colorstate", "GR");
    left_axis_sittings.setAttribute("data-key", m_input.GMPD_AXIS_0);
    left_axis_sittings.setAttribute("data-svgid", _svg.length);
    right_axis_sittings.setAttribute("id", "pad_right_axis");
    right_axis_sittings.setAttribute("data-colorstate", "GR");
    right_axis_sittings.setAttribute("data-key", m_input.GMPD_AXIS_2);
    right_axis_sittings.setAttribute("data-svgid", _svg.length + 1);
    _svg.push(axis_setting_svg, axis_setting_svg);

    append_elems_click_cb(_elems, BLUE_COLOR_REGEXP);
    append_elems_click_cb(_axis_settings_elems, GREY_COLOR);
}

function create_wheel_interface(main_div) {

    _is_pad_mode = false;

    var wheel_elem = document.createElement("div");
    var wheel_btn_0 = document.createElement("div");
    var wheel_btn_1 = document.createElement("div");
    var wheel_btn_2 = document.createElement("div");
    var wheel_btn_3 = document.createElement("div");
    var wheel_btn_4 = document.createElement("div");
    var wheel_btn_5 = document.createElement("div");
    var wheel_btn_6 = document.createElement("div");
    var wheel_btn_7 = document.createElement("div");
    var wheel_btn_8 = document.createElement("div");
    var wheel_btn_9 = document.createElement("div");
    var wheel_btn_10 = document.createElement("div");
    var wheel_btn_11 = document.createElement("div");
    var wheel_btn_12 = document.createElement("div");
    var wheel_btn_13 = document.createElement("div");
    var wheel_btn_14 = document.createElement("div");
    var wheel_btn_15 = document.createElement("div");
    var wheel_btn_16 = document.createElement("div");
    var wheel_btn_17 = document.createElement("div");
    var wheel_btn_18 = document.createElement("div");
    var wheel_btn_19 = document.createElement("div");
    var wheel_btn_20 = document.createElement("div");
    var wheel_btn_21 = document.createElement("div");
    var wheel_btn_22 = document.createElement("div");
    var wheel_btn_23 = document.createElement("div");
    var wheel_btn_24 = document.createElement("div");
    var left_pedal_settings_elem = document.createElement("div");
    var midle_pedal_settings_elem = document.createElement("div");
    var right_pedal_settings_elem = document.createElement("div");
    var wheel_settings_elem = document.createElement("div");
    var gearbox_settings_hor_elem = document.createElement("div");
    var gearbox_settings_vert_elem = document.createElement("div");

    _device_elem = wheel_elem;

    var btn_def_style =
        "position: absolute;" +
        "height: auto;" +
        "background-image: " + SVG_BASE64 + btoa(wheel_btn) + "');" +
        "width: 19px;" +
        "height: 19px;" +
        "background-size: 100% 100%;";

    wheel_elem.style.cssText =
        "position: absolute;" +
        "background-image: " + SVG_BASE64 + btoa(wheel_svg) + "');" +
        "width: 397px;" +
        "height: 455px;" +
        "-moz-transform: translateX(-50%);" +
        "-ms-transform: translateX(-50%);" +
        "-webkit-transform: translateX(-50%);" +
        "transform: translateX(-50%);" +
        "background-size: 100% 100%;" +
        "left: 50%;" +
        "margin-left: 25px;" +
        "margin-bottom: 40px;" +
        "bottom: 0px;";
    wheel_btn_0.style.cssText =
        btn_def_style + 
        "top: 132px;" +
        "left: 331px;";
    wheel_btn_1.style.cssText =
        btn_def_style + 
        "top: 122px;" +
        "left: 315px;";
    wheel_btn_2.style.cssText =
        btn_def_style + 
        "top: 122px;" +
        "left: 347px;";
    wheel_btn_3.style.cssText =
        btn_def_style + 
        "top: 113px;" +
        "left: 331px;";
    wheel_btn_4.style.cssText =
        "position: absolute;" +
        "height: auto;" +
        "background-image: " + SVG_BASE64 + btoa(wheel_right_svg) + "');" +
        "width: 54px;" +
        "height: 37px;" +
        "background-size: 100% 100%;" + 
        "top: 84px;" +
        "left: 166px;";
    wheel_btn_5.style.cssText =
        "position: absolute;" +
        "height: auto;" +
        "background-image: " + SVG_BASE64 + btoa(wheel_left_svg) + "');" +
        "width: 54px;" +
        "height: 37px;" +
        "background-size: 100% 100%;" + 
        "top: 84px;" +
        "left: 36px;";
    wheel_btn_6.style.cssText =
        btn_def_style + 
        "top: 107px;" +
        "left: 141px;";
    wheel_btn_7.style.cssText =
        btn_def_style + 
        "top: 107px;" +
        "left: 90px;";
    wheel_btn_8.style.cssText =
        btn_def_style + 
        "top: 185px;" +
        "left: 321px;";
    wheel_btn_9.style.cssText =
        btn_def_style + 
        "top: 185px;" +
        "left: 340px;";
    wheel_btn_10.style.cssText =
        btn_def_style + 
        "top: 179px;" +
        "left: 358px;";
    wheel_btn_11.style.cssText =
        btn_def_style + 
        "top: 178px;" +
        "left: 303px;";
    wheel_btn_12.style.cssText =
        btn_def_style + 
        "top: 210px;" +
        "left: 299px;";
    wheel_btn_13.style.cssText =
        btn_def_style + 
        "top: 279px;" +
        "left: 299px;";
    wheel_btn_14.style.cssText =
        btn_def_style + 
        "top: 210px;" +
        "left: 321px;";
    wheel_btn_15.style.cssText =
        btn_def_style + 
        "top: 279px;" +
        "left: 321px;";
    wheel_btn_16.style.cssText =
        btn_def_style + 
        "top: 210px;" +
        "left: 344px;";
    wheel_btn_17.style.cssText =
        btn_def_style + 
        "top: 278px;" +
        "left: 344px;";
    wheel_btn_18.style.cssText =
        btn_def_style + 
        "top: 124px;" +
        "left: 147px;";
    wheel_btn_19.style.cssText =
        btn_def_style + 
        "top: 138px;" +
        "left: 133px;";
    wheel_btn_20.style.cssText =
        btn_def_style + 
        "top: 124px;" +
        "left: 82px;";
    wheel_btn_21.style.cssText =
        btn_def_style + 
        "top: 138px;" +
        "left: 96px;";
    wheel_btn_22.style.cssText =
        btn_def_style + 
        "top: 278px;" +
        "left: 367px;";

    var pedal_scc = "position: absolute;" +
        "background-image: " + SVG_BASE64 + btoa(pedal_svg) + "');" +
        "width: 19px;" +
        "height: 46px;" +
        "background-size: 100% 100%;";

    left_pedal_settings_elem.style.cssText =
        pedal_scc +
        "top: 291px;" +
        "left: 50px;";
    midle_pedal_settings_elem.style.cssText =
        pedal_scc +
        "top: 291px;" +
        "left: 111px;";
    right_pedal_settings_elem.style.cssText =
        pedal_scc +
        "top: 291px;" +
        "left: 171px;";
    wheel_settings_elem.style.cssText =
        "position: absolute;" +
        "background-image: " + SVG_BASE64 + btoa(wheel_settings_svg) + "');" +
        "width: 297px;" +
        "height: 179px;" +
        "background-size: 100% 100%;" +
        "top: 43px;" +
        "left: -25px;";
    gearbox_settings_hor_elem.style.cssText =
        "position: absolute;" +
        "background-image: " + SVG_BASE64 + btoa(gearbox_hor_svg) + "');" +
        "width: 33px;" +
        "height: 10px;" +
        "background-size: 100% 100%;" +
        "top: 159px;" +
        "left: 324px;";
    gearbox_settings_vert_elem.style.cssText =
        "position: absolute;" +
        "background-image: " + SVG_BASE64 + btoa(gearbox_vert_svg) + "');" +
        "width: 10px;" +
        "height: 33px;" +
        "background-size: 100% 100%;" +
        "top: 148px;" +
        "left: 335px;";

    main_div.appendChild(wheel_elem);
    wheel_elem.appendChild(left_pedal_settings_elem);
    wheel_elem.appendChild(midle_pedal_settings_elem);
    wheel_elem.appendChild(right_pedal_settings_elem);
    wheel_elem.appendChild(wheel_settings_elem);
    wheel_elem.appendChild(gearbox_settings_hor_elem);
    wheel_elem.appendChild(gearbox_settings_vert_elem);
    wheel_elem.appendChild(wheel_btn_0);
    wheel_elem.appendChild(wheel_btn_1);
    wheel_elem.appendChild(wheel_btn_2);
    wheel_elem.appendChild(wheel_btn_3);
    wheel_elem.appendChild(wheel_btn_4);
    wheel_elem.appendChild(wheel_btn_5);
    wheel_elem.appendChild(wheel_btn_6);
    wheel_elem.appendChild(wheel_btn_7);
    wheel_elem.appendChild(wheel_btn_8);
    wheel_elem.appendChild(wheel_btn_9);
    wheel_elem.appendChild(wheel_btn_10);
    wheel_elem.appendChild(wheel_btn_11);
    wheel_elem.appendChild(wheel_btn_12);
    wheel_elem.appendChild(wheel_btn_13);
    wheel_elem.appendChild(wheel_btn_14);
    wheel_elem.appendChild(wheel_btn_15);
    wheel_elem.appendChild(wheel_btn_16);
    wheel_elem.appendChild(wheel_btn_17);
    wheel_elem.appendChild(wheel_btn_18);
    wheel_elem.appendChild(wheel_btn_19);
    wheel_elem.appendChild(wheel_btn_20);
    wheel_elem.appendChild(wheel_btn_21);
    wheel_elem.appendChild(wheel_btn_22);

    _elems.length = 0;
    _svg.length = 0;
    _axis_elems.length = 0;
    _axis_settings_elems.length = 0;
    _elems.push(wheel_btn_0, wheel_btn_1, wheel_btn_2, wheel_btn_3, wheel_btn_4,
            wheel_btn_5, wheel_btn_6, wheel_btn_7, wheel_btn_8, wheel_btn_9,
            wheel_btn_10, wheel_btn_11, wheel_btn_12, wheel_btn_13, wheel_btn_14,
            wheel_btn_15, wheel_btn_16, wheel_btn_17, wheel_btn_18, wheel_btn_19,
            wheel_btn_20, wheel_btn_21, wheel_btn_22);
    _svg.push(wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_right_svg, wheel_left_svg,
            wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_btn,
            wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_btn,
            wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_btn, wheel_btn);
    _axis_settings_elems.push(wheel_settings_elem, left_pedal_settings_elem,
            right_pedal_settings_elem, midle_pedal_settings_elem,
            gearbox_settings_hor_elem, gearbox_settings_vert_elem);

    //setting attributes

    for (var i = 0; i < _elems.length; i++) {
        _elems[i].setAttribute("id", "wheel_btn_" + i);
        _elems[i].setAttribute("data-colorstate", "B");
        _elems[i].setAttribute("data-key", i);
        _elems[i].setAttribute("data-svgid", i);
    }
    for (var i = 0; i < _axis_settings_elems.length; i++) {
        _elems[i].setAttribute("id", "wheel_axis_" + i);
        _elems[i].setAttribute("data-colorstate", "GR");
    }
    wheel_settings_elem.setAttribute("data-key", m_input.GMPD_AXIS_0);
    wheel_settings_elem.setAttribute("data-svgid", _svg.length);
    left_pedal_settings_elem.setAttribute("data-key", m_input.GMPD_AXIS_1);
    left_pedal_settings_elem.setAttribute("data-svgid", _svg.length + 1);
    right_pedal_settings_elem.setAttribute("data-key", m_input.GMPD_AXIS_2);
    right_pedal_settings_elem.setAttribute("data-svgid", _svg.length + 2);
    midle_pedal_settings_elem.setAttribute("data-key", m_input.GMPD_AXIS_3);
    midle_pedal_settings_elem.setAttribute("data-svgid", _svg.length + 3);
    gearbox_settings_hor_elem.setAttribute("data-key", m_input.GMPD_AXIS_4);
    gearbox_settings_hor_elem.setAttribute("data-svgid", _svg.length + 4);
    gearbox_settings_vert_elem.setAttribute("data-key", m_input.GMPD_AXIS_5);
    gearbox_settings_vert_elem.setAttribute("data-svgid", _svg.length + 5);
    _svg.push(wheel_settings_svg, pedal_svg, pedal_svg, pedal_svg,
            gearbox_hor_svg, gearbox_vert_svg);

    append_elems_click_cb(_elems, BLUE_COLOR_REGEXP);
    append_elems_click_cb(_axis_settings_elems, GREY_COLOR);
}

function create_sensors(gmpd_id) {
    var sensors = [
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_0, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_1, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_2, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_3, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_4, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_5, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_6, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_7, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_8, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_9, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_10, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_11, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_12, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_13, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_14, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_15, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_16, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_17, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_18, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_19, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_20, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_21, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_22, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_23, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_24, gmpd_id),
            m_ctrl.create_gamepad_btn_sensor(m_input.GMPD_BUTTON_25, gmpd_id)
    ];
    return sensors;
}

function create_axis_sensors(gmpd_id) {
    var sensors = [
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_0, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_1, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_2, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_3, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_4, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_5, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_6, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_7, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_8, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_9, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_10, gmpd_id),
            m_ctrl.create_gamepad_axis_sensor(m_input.GMPD_AXIS_11, gmpd_id)
    ];
    return sensors;
}

function append_type_elem(parent, text) {
    var select_type_elem = document.createElement("input");
    select_type_elem.style.cssText =
        "display: inline-block;" +
        "position = relative;"
    select_type_elem.setAttribute('type', 'radio');
    select_type_elem.setAttribute('name', 'choice');
    var select_type_label = document.createElement("label");
    select_type_label.textContent = text;
    select_type_label.style.cssText =
        "position = relative;" +
        "display: inline-block;" +
        "color: white;";
    parent.appendChild(select_type_elem);
    parent.appendChild(select_type_label);
    return select_type_elem;
}

function reset_device_type() {
    _main_element.removeChild(_device_elem);
    _device_elem = null;
}

function change_device(type) {
    reset_device_type();
    switch(type) {
    case "PAD":
        _type_pad_elem.checked = true;
        create_pad_interface(_main_element);
        break;
    case "WHEEL":
        _type_wheel_elem.checked = true;
        create_wheel_interface(_main_element);
        break;
    };
}

function append_elems_click_cb(elems, original_color) {
    var click_cb = function(e) {
        var elem = e.target;
        if(_selected_gamepad_num < 0 || elem.dataset.colorstate == "G")
                return;
        if (_mode != VIEWER_MODE) {
            if (elem.dataset.colorstate == "R") {
                _selected_btn = null;
                document.getElementById("action_label").textContent =
                        SELECT_BTN_CAPTION;
                _mode = VIEWER_MODE;
            }
            if (elem.dataset.colorstate == "B" || elem.dataset.colorstate == "GR") {
                var svg_num = parseFloat(_selected_btn.dataset.svgid);
                _selected_btn.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_num])  + "')";
                _selected_btn.setAttribute("data-colorstate", elem.dataset.colorstate);
                _selected_btn = elem;
                svg_num = parseFloat(elem.dataset.svgid);
                elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_num].replace(original_color,
                        RED_COLOR))  + "')";
                elem.setAttribute("data-colorstate", "R");
            }
        } else {
            var svg_num = parseFloat(elem.dataset.svgid);
            var mode = elem.dataset.colorstate == "B" ? BTN_EDIT_MODE : AXIS_EDIT_MODE;
            _mode = mode;
            elem.style.backgroundImage = SVG_BASE64 + btoa(_svg[svg_num].replace(original_color,
                    RED_COLOR))  + "')";
            elem.setAttribute("data-colorstate", "R");
            if (mode == BTN_EDIT_MODE)
                document.getElementById("action_label").textContent =
                        PRESS_BTN_CAPTION;
            else
                document.getElementById("action_label").textContent =
                        MOVE_AXIS_CAPTION;
            _selected_btn = elem;
        }
    }
    for (var i = 0; i < elems.length; i++) {
        var elem = elems[i];
        elem.addEventListener("click", click_cb, false);
    }
}

function create_device_icon_elem(number) {
    var icon = document.createElement("label");
    icon.style.cssText =
        "position: relative;" +
        "display: inline-block;" + 
        "width: 50px;" +
        "color: white;" +
        "margin: 0 10px;" +
        "font-size: 36px;" +
        "line-height: 50px;" +
        "background-color: black;" +
        "border: 3px solid white;" +
        "border-radius: 5px;" +
        "height: 50px;";
    icon.textContent = number;
    return icon;
}

function zoom_main_div() {
    var width  = window.innerWidth;
    var height = window.innerHeight;

    if ((height <= 750 && height > 400) || (width <= 750 && width > 400))
        _main_element.style.zoom = "0.5";
    else if (width <= 400 || height <= 400)
        _main_element.style.zoom = "0.3";
    else
        _main_element.style.zoom = "1";
}

};
