/* tweaks-panel.jsx — loaded by Hookups App.html via <script type="text/babel">
   All exports use `var` so Babel-standalone promotes them to global scope. */

var useTweaks = function(defaults) {
  var _state = React.useState(defaults);
  var tweaks = _state[0];
  var setTweaks = _state[1];
  var setTweak = function(key, value) {
    setTweaks(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = value;
      return next;
    });
  };
  return [tweaks, setTweak];
};

var TweaksPanel = function({ children }) {
  var _open = React.useState(false);
  var open = _open[0];
  var setOpen = _open[1];

  var panelStyle = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  var cardStyle = {
    background: '#1a2a29',
    border: '1px solid #2a3d3b',
    borderRadius: 14,
    padding: '12px 16px',
    minWidth: 200,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    display: open ? 'block' : 'none',
  };

  var gearStyle = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#1a2a29',
    border: '1px solid #2a3d3b',
    color: '#2DD4BF',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  };

  return (
    <div style={panelStyle}>
      <div style={cardStyle}>
        {children}
      </div>
      <button style={gearStyle} onClick={function() { setOpen(function(v) { return !v; }); }}>
        ⚙
      </button>
    </div>
  );
};

var TweakSection = function({ label }) {
  var style = {
    color: '#5EEAD4',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  };
  return <div style={style}>{label}</div>;
};

var TweakToggle = function({ label, value, onChange }) {
  var rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  };

  var labelStyle = {
    color: '#B8E0DC',
    fontSize: 13,
    fontWeight: 500,
  };

  var trackStyle = {
    width: 36,
    height: 20,
    borderRadius: 10,
    background: value ? '#0D9488' : '#2a3d3b',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  };

  var thumbStyle = {
    position: 'absolute',
    top: 2,
    left: value ? 18 : 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: value ? '#fff' : '#5a7575',
    transition: 'left 0.2s, background 0.2s',
  };

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={trackStyle} onClick={function() { onChange(!value); }}>
        <div style={thumbStyle} />
      </div>
    </div>
  );
};
