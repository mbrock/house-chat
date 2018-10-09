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

app.connect("startup", () => {
  window = new Gtk.ApplicationWindow({
    application: app,
    title: "D27",
    border_width: 0,
    default_width: 800,
    default_height: 600,
  })

  let css = new Gtk.CssProvider()
  let display = Gdk.Display.get_default()
  let screen = display.get_default_screen()
  Gtk.StyleContext.add_provider_for_screen(
    screen, css, Gtk.STYLE_PROVIDER_PRIORITY_USER
  )
  
  css.load_from_data(`
    .chat-line { 
      font-family: monospace; 
      padding: 4px;
    }

    .date {
      opacity: 0.5;
    }
  `)
  
  let bar = new Gtk.HeaderBar({
    show_close_button: false,
    title: "D27 House Terminal",
    subtitle: "Welcome",
  })

  window.set_titlebar(bar)

  let action_button = new Gtk.Button({
    label: "Say something"
  })
  bar.pack_start(action_button)

  let register_button = new Gtk.Button({
    label: "Make new user"
  })
  bar.pack_start(register_button)
  
  let listbox = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.NONE,
  })

  let df = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  })
  
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
    listbox.add(vbox)
    // listbox.add(new Gtk.Separator())
    vbox.show_all()
  }

  let popover = new Gtk.Popover()
  let saywho = new Gtk.ComboBoxText()
  popover.set_relative_to(action_button)
  {
    let box = new Gtk.Box({ spacing: 5 })
    box.add(saywho)
    let wat = new Gtk.Entry()
    wat.connect("activate", () => {
      act({
        type: "say",
        name: saywho.get_active_text(),
        text: wat.get_text()
      })
      GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => scrollToBottom())
      wat.set_text("")
      popover.hide()
    })
    box.add(wat)
    popover.add(box)
  }
  popover.set_position(Gtk.PositionType.BOTTOM)

  action_button.grab_focus()
  action_button.connect("clicked", () => {
    popover.show_all()
  })

  let popover2 = new Gtk.Popover()
  popover2.set_relative_to(register_button)
  {
    let who = new Gtk.Entry({
      placeholder_text: "Name of new user"
    })
    popover2.add(who)
    who.connect("activate", () => {
      act({ type: "register", name: who.get_text() })
      who.set_text("")
      popover2.hide()
    })
  }

  register_button.connect("clicked", () => {
    popover2.show_all()
  })
  
  let box1 = new Gtk.VBox()
  window.add(box1)

  let scroll = new Gtk.ScrolledWindow()
  scroll.add(listbox)
  box1.add(scroll)

  let scrollToBottom = () => {
    let adj = scroll.get_vadjustment()
    adj.set_value(adj.get_upper() + 1000)
  }

  GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => scrollToBottom())
  
  let handle = event => {
    if (event.type == "register") {
      state.users.push(event.name)
      saywho.append(event.name, event.name)
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
