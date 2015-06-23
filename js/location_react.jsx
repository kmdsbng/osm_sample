/* global React, google */

var LocationModel = function (latitude, longitude, address) {
  this.latitude = latitude;
  this.longitude = longitude;
  this.address = address;
  this.subscriber = null;
};

var mproto = LocationModel.prototype;

mproto.inform = function () {
  if (this.subscriber) {
    this.subscriber();
  }
};

mproto.setPos = function (lat, lng) {
  this.latitude = lat;
  this.longitude = lng;
  this.inform();
};

mproto.setAddress = function (address) {
  this.address = address;
  this.inform();
};

// 地図コンポーネント
var MapComponent = React.createClass({
  changePos: function (lat, lng) {
    this.props.model.setPos(lat, lng);
  },
  getInitialState: function () {
    return {
      map: null,
      marker: null,
      centerLat: null,
      centerLng: null
    };
  },
  setupGoogleMap: function (mapNode, initialPos) {
    var component = this;

    // マップタイプに、OpenStreetMapのみ有効にする
    // googlemapのタイルサーバは、無償版はhttpのみサポートなので、
    // OpenStreetMapを利用する。
    // ただし、OpenStreetMapのポリシーで、通信料多いとブロックするよ、と
    // なってるので、そのときはYahoo MapかGoogle Mapの有料版を
    // 使う必要がある。
    var mapTypeIds = ["OSM"];

    // マップを初期表示
    var map = new google.maps.Map(mapNode, {
      center: initialPos,
      zoom: 16,
      mapTypeId: "OSM",
      mapTypeControlOptions: {
        mapTypeIds: mapTypeIds
      },
      streetViewControl: false
    });

    // OpenStreetMapのタイルサーバを指定。OpenStreetMapのhttpsURLを指定している。
    map.mapTypes.set("OSM", new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        return "https://a.tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
      },
      tileSize: new google.maps.Size(256, 256),
      name: "OpenStreetMap",
      maxZoom: 18
    }));

    // 地図の中心のマーカーを表示。初期表示位置として、地図の中心をセット。
    var marker = new google.maps.Marker({
      position: map.getCenter(),
      map: map,
      title: '物件位置',
      icon: {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, // 下向き矢印図形を設定
        scale: 5,
        strokeColor: '#FF0000',
        fillColor: '#FF0000',
        fillOpacity: 0.5,
        strokeWeight: 2
      }
    });

    // 中心点が変更された時のイベントリスナを設定。
    google.maps.event.addListener(map, 'center_changed', function(){
      var pos = map.getCenter();
      component.setState({centerLat: pos.lat(), centerLng: pos.lng()});
      component.changePos(pos.lat(), pos.lng());
    });

    this.setState({map: map, marker: marker});
  },
  componentDidMount: function () {
    var mapNode = this.refs.map.getDOMNode();
    var initialPos = new google.maps.LatLng(this.props.model.latitude, this.props.model.longitude);
    this.setupGoogleMap(mapNode, initialPos);
  },
  componentDidUpdate: function () {
    var newPos = new google.maps.LatLng(this.props.model.latitude, this.props.model.longitude);
    if (this.props.model.latitude !== this.state.centerLat || this.props.model.longitude !== this.state.centerLng) {
      this.state.map.setCenter(newPos);
    }
    this.state.marker.setPosition(newPos);
  },
  render: function () {
    return (
      <div id='map' ref='map' style={{width: '550px', height: '500px'}}></div>
    );
  }
});

// 位置情報、住所テキストボックスコンポーネント
var MapForm = React.createClass({
  handleAddressChange: function (e) {
    this.props.model.setAddress(e.target.value);
  },

  handleAddressSearch: function (e) {
    // 住所から検索機能
    var query_word = this.props.model.address;
    var geocoder = new google.maps.Geocoder();
    var component = this;
    geocoder.geocode(
      {
        'address': query_word,
        'region': 'jp'
      },
      function(results, status){
        if(status === google.maps.GeocoderStatus.OK && results.length > 0){
          // 検索結果座標を、位置情報として保存する
          var pos = results[0].geometry.location;
          component.props.model.setPos(pos.lat(), pos.lng());
        } else {
          alert('一致する住所が見つかりませんでした');
        }
      }
    );
  },
  render: function () {
    return (
      <table>
        <tr>
          <td>
            緯度
          </td>
          <td>
            <input id='latitude' readOnly={true} type='text' value={this.props.model.latitude} />
          </td>
        </tr>
        <tr>
          <td>
            経度
          </td>
          <td>
            <input id='longitude' readOnly={true} type='text' value={this.props.model.longitude} />
          </td>
        </tr>
        <tr>
          <td>
            住所
          </td>
          <td>
            <input
              id='address'
              type='text'
              onChange={this.handleAddressChange}
              value={this.props.model.address} />
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            <a
              id="address_search"
              onClick={this.handleAddressSearch}
              href="#">住所から再検索</a>
          </td>
        </tr>
      </table>
    );
  }
});

var App = React.createClass({

  handleSave: function (e) {
    var openerDocument = window.opener.document;

    // 保存ボタン押下時に、緯度経度を親ウインドウにセットし、地図ウインドウを閉じる
    openerDocument.getElementById('latitude').value = this.props.model.latitude;
    openerDocument.getElementById('longitude').value = this.props.model.longitude;
    window.close();
  },

  render: function () {
    var model = this.props.model;

    var mapForm = (
      <MapForm
        model={model}
      />
    );

    var map = (
      <MapComponent
        model={model}
      />
    );

    return (
      <table style={{width: '1000px'}}>
        <tr>
          <td style={{verticalAlign: 'top'}}>
            <table>
              <tr>
                <td style={{verticalAlign: 'top', width: 400}}>
                  {mapForm}
                </td>
                <td align='center' width='560'>
                  {map}
                </td>
              </tr>
              <tr>
                <td></td>
                <td>
                  <a
                    onClick={this.handleSave}
                    style={{float: 'right', textAlign: 'center', width: '100px', height: '40px', fontSize: '30px'}} id="save" href="#">保存</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    );
  }

});

// 緯度経度の入力がないか？
function isEmpty(obj) {
  return (obj === null) || (obj === "");
}

// 初期表示位置、住所を取得
// retval: [pos, address]
function getInitialPosAndAddress() {
  var openerDocument = window.opener.document;
  var address = openerDocument.getElementById('address').value;
  var latitude = openerDocument.getElementById('latitude').value;
  var longitude = openerDocument.getElementById('longitude').value;

  if (isEmpty(latitude) || isEmpty(longitude)) {
    // 初期値は東京タワー
    latitude = 35.65858;
    longitude = 139.745433;
    if (address === "") {
      address = "東京タワー";
    }
  }

  var pos = new google.maps.LatLng(latitude, longitude);
  return [pos, address];
}

function init() {
  var pos_and_address = getInitialPosAndAddress();
  var latitude = pos_and_address[0].lat();
  var longitude = pos_and_address[0].lng();
  var address = pos_and_address[1];
  var locationModel = window.locationModel = new LocationModel(latitude, longitude, address);

  function render() {
    React.render(
      <App model={locationModel} />,
      document.getElementById('app')
    );
  }

  locationModel.subscriber = render;
  render();
}

init();


