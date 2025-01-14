///
/// Edit window which pops up when the edit button is pressed on a FormatOption
///

///
/// EditWindow constructor.
///
/// @param {Gtk.Widget} parent - Preferences widget.
/// @param {string} gladeFile - Glade file contents.
/// @param {Settings} settings - Settings object.
/// @param {Object} language - Language map.
/// 
var Class = function (parent, gladeFile, settings, language) {
	const GLib = imports.gi.GLib;
	const Utilities = imports.misc.extensionUtils.getCurrentExtension().imports.Utilities;

	const builder = Utilities.getBuilder(gladeFile);
	const window = builder.get_object("editWindow");
	const title = builder.get_object("editWindowTitle");
	const applyButton = builder.get_object("editWindowApplyButton");
	const closeButton = builder.get_object("editWindowCloseButton");
	const formatEntry = builder.get_object("editWindowFormatEntry");
	const preview = builder.get_object("editWindowPreviewLabel");
	const notebook = builder.get_object("editWindowFormatOptionsNotebook");

	let updateTimeoutID = 0;
	let applyButtonClickID = 0;
	let defaultFormat = "";

	// Insert format option
	const clickFormatOption = function (label, uri) {
		formatEntry.delete_selection();
		formatEntry.set_position(formatEntry.insert_text(uri, uri.length, formatEntry.cursor_position));
		return true;
	};

	// Translate
	builder.get_object("editWindowFormatFrameLabel").set_text(language.format);
	builder.get_object("editWindowPreviewFrameLabel").set_text(language.preview);
	builder.get_object("editWindowFormatOptionsFrameLabel").set_text(language.formatOptions);
	language.pages.forEach((page) => {
		const builder = Utilities.getBuilder(gladeFile);
		const pageWidget = builder.get_object("formatOptionsPage");
		const pageLabel = builder.get_object("formatOptionsPageLabel");
		const pageGrid = builder.get_object("formatOptionsPageGrid");

		pageLabel.set_text(page.label);
		page.content.forEach((row, index) => {
			const builder = Utilities.getBuilder(gladeFile);
			const formatOptionLabel = builder.get_object("formatOptionLabel");
			const formatOptionDescription = builder.get_object("formatOptionDescription");

			if (row[0][0] == "%") formatOptionLabel.set_markup("<a href='" + row[0] + "'>" + row[0] + "</a>");
			else formatOptionLabel.set_text(row[0]);
			formatOptionLabel.connect("activate-link", clickFormatOption);
			formatOptionDescription.set_text(row[1]);

			pageGrid.attach(formatOptionLabel, 0, index, 1, 1);
			pageGrid.attach(formatOptionDescription, 1, index, 1, 1);
		});

		notebook.append_page(pageWidget, pageLabel);
	});

	// Update preview
	const updatePreview = function () {
		preview.set_text(Utilities.dateTimeFormat(formatEntry.get_text(), defaultFormat));
		return true;
	};

	formatEntry.connect("changed", updatePreview);
	formatEntry.connect("notify::text", () => {
		applyButton.get_style_context().add_class("suggested-action");
		applyButton.set_sensitive(true);
		applyButton.set_receives_default(true);
	});


	// Hide window and disconnect elements.
	const hideWindow = function () {
		// Stop updatePreview()
		if (updateTimeoutID != 0) {
			GLib.Source.remove(updateTimeoutID);
			updateTimeoutID = 0;
		}

		// Disconnect apply button
		if (applyButtonClickID != 0) {
			applyButton.disconnect(applyButtonClickID);
			applyButtonClickID = 0;
		}

		window.hide();
	};

	// Close button
	closeButton.connect("clicked", hideWindow);
	//builder.get_object("editWindowCloseButton").connect_swapped(window, "response", hide, window);

	///
	/// Show the edit window.
	///
	/// @param {string} formatTarget - Name of the format target.
	/// @param {Object} formatTargetObject - Format target object loaded from the formatTarget/ folder.
	/// @param {string} formatTargetObject.defaultFormat - Default datetime format for this target.
	/// @param {function(): boolean} updateParentPreview - Callback to update the parent preview label.
	/// @param {string} name - Format target name.
	///
	this.showWindow = function (formatTarget, formatTargetObject, updateParentPreview, name) {
		title.set_text(name + " - " + language.format);
		window.set_transient_for(parent.get_root());
		formatEntry.set_text(settings.getFormat(formatTarget));
		formatEntry.select_region(0, -1);
		formatEntry.grab_focus();
		applyButton.get_style_context().remove_class("suggested-action");
		applyButton.set_sensitive(false);
		closeButton.set_receives_default(true);
		defaultFormat = formatTargetObject.defaultFormat;

		// Click apply button, hide window, save settings, and update parent
		applyButtonClickID = applyButton.connect("clicked", function () {
			hideWindow();
			settings.setFormat(formatTarget, formatEntry.get_text());
			updateParentPreview();
		});

		updateTimeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, updatePreview);
		updatePreview();
		window.show();
	};
};
