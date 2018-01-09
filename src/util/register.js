/**
 * Copyright (C) 2014-2017 Triumph LLC
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
import b4w from "./b4w.js";

var _factories = {};

// TODO: assign export_functions into module_context to allow old module system to work.
export default function(module_name, module_context, export_functions) {
  var _ns = {};
  var is_internal = module_name.split("").slice(0, 2).join("") == "__";
  function internal_factory() {
    return function (ns) {
      ns = ns || "__b4w_default";

      if (_ns[ns] !== undefined) {
        return _ns[ns];
      }

      _ns[ns] = is_internal ? {} : internal_factory();
      module_context(ns, _ns[ns]);

      return _ns[ns];
    };
  };

  if (_factories[module_name] !== undefined) {
    return _factories[module_name];
  } else {
    // FIXME: the next code is bad. PLZ understand and forgive me
    var factory = is_internal ? internal_factory() : internal_factory()();

    b4w._n_module[module_name] = _factories[module_name] = factory;

    return factory;
  }
}
