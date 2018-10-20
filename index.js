#!/usr/bin/env gjs

imports.gi.versions.Gtk = "3.0"

let Gtk = imports.gi.Gtk
let Gdk = imports.gi.Gdk
let Gio = imports.gi.Gio
let GLib = imports.gi.GLib
let ByteArray = imports.byteArray
let app = new Gtk.Application()
let window

let state = {
  users: [],
  lines: [],
}

let f = Gio.File.new_for_path("/tmp/x.json")
let append = f.append_to(Gio.FileCreateFlags.NONE, null)

let save = event => {
  append.write(JSON.stringify(event) + "\n", null)
}

let css = style => {
  let css = new Gtk.CssProvider()
  let display = Gdk.Display.get_default()
  let screen = display.get_default_screen()
  Gtk.StyleContext.add_provider_for_screen(
    screen, css, Gtk.STYLE_PROVIDER_PRIORITY_USER
  )
  
  css.load_from_data(style)
}

let df = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "long",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
})

app.connect("startup", () => {
  window = new Gtk.ApplicationWindow({
    application: app,
    title: "D27",
    border_width: 0,
    default_width: 800,
    default_height: 600,
  })

  window.maximize()
  
  css(`
    .chat-line { 
      font-family: monospace; 
      padding: 4px;
    }

    .date {
      opacity: 0.5;
    }
  `)

  let root = {
    headerBar: new Gtk.HeaderBar({
      show_close_button: false,
      title: "D27 House Terminal",
      subtitle: "Welcome",
    }),

    saySomething: {
      button: new Gtk.Button({
        label: "Say something"
      }),

      popover: new Gtk.Popover(),
      box: new Gtk.Box({ spacing: 5 }),
      who: new Gtk.ComboBoxText(),
      text: new Gtk.Entry(),
    },
    
    makeNewUser: {
      button: new Gtk.Button({
        label: "Make new user"
      }),

      popover: new Gtk.Popover(),
      who: new Gtk.Entry(),
    },

    scroll: new Gtk.ScrolledWindow(),
    
    listbox: new Gtk.ListBox({
      selection_mode: Gtk.SelectionMode.NONE,
    }),
  }
  
  window.set_titlebar(root.headerBar)
  root.headerBar.pack_start(root.saySomething.button)
  root.headerBar.pack_start(root.makeNewUser.button)

  let say = (who, when, text) => {
    let vbox = new Gtk.VBox({ spacing: 4 })
    let box = new Gtk.Box()
    let datelabel = new Gtk.Label({
      label: `${df.format(when)}`,
      margin_end: "8",
      yalign: 0,
    })
    datelabel.get_style_context().add_class("date")
    box.pack_start(new Gtk.Label({
      label: `<b>${who}</b>`,
      use_markup: true,
      margin_end: "8",
      yalign: 0,
    }), false, false, 0)
    box.pack_start(datelabel, false, false, 0)
    vbox.add(box)
    let msgbox = new Gtk.Label({
      label: text,
      use_markup: true,
      xalign: 0.0,
      justify: Gtk.Justification.LEFT,
      wrap: true,
    })
    vbox.add(msgbox)
    vbox.get_style_context().add_class("chat-line")
    root.listbox.add(vbox)
    vbox.show_all()
  }

  root.saySomething.popover.set_relative_to(root.saySomething.button)
  root.saySomething.text.connect("activate", () => {
    act({
      type: "say",
      name: root.saySomething.who.get_active_text(),
      text: root.saySomething.text.get_text()
    })
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => scrollToBottom())
    root.saySomething.text.set_text("")
    root.saySomething.popover.hide()
  })
  
  root.saySomething.box.add(root.saySomething.who)
  root.saySomething.box.add(root.saySomething.text)
  root.saySomething.popover.add(root.saySomething.box)
  root.saySomething.popover.set_position(Gtk.PositionType.BOTTOM)

  root.saySomething.button.grab_focus()
  root.saySomething.button.connect("clicked", () => {
    root.saySomething.popover.show_all()
  })

  root.makeNewUser.popover.set_relative_to(root.makeNewUser.button)
  root.makeNewUser.popover.add(root.makeNewUser.who)
  root.makeNewUser.who.connect("activate", () => {
    act({ type: "register", name: root.makeNewUser.who.get_text() })
    root.makeNewUser.who.set_text("")
    root.makeNewUser.popover.hide()
  })

  root.makeNewUser.button.connect("clicked", () => {
    root.makeNewUser.popover.show_all()
  })
  
  root.scroll.add(root.listbox)
  window.add(root.scroll)

  let scrollToBottom = () => {
    let adj = root.scroll.get_vadjustment()
    adj.set_value(adj.get_upper() + 1000)
  }

  GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => scrollToBottom())
  
  let handle = event => {
    if (event.type == "register") {
      state.users.push(event.name)
      root.saySomething.who.append(event.name, event.name)
    }
  
    if (event.type == "say") {
      state.lines.push({
        name: event.name,
        date: new Date(event.date),
        text: event.text
      })
      say(event.name, new Date(event.date), event.text)
    }
  }
  
  let act = event => {
    event.date = new Date()
    save(event)
    handle(event)
  }

  let [ok, content] = f.load_contents(null)
  if (ok) {
    ByteArray.toString(content).split("\n").forEach(
      x => x && handle(JSON.parse(x))
    )
  }
})

app.connect("activate", () => window.show_all())
app.run(ARGV)
