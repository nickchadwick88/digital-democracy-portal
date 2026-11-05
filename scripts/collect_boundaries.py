#!/usr/bin/env python3
"""Census KML to GeoJSON-like rings; no invented geographic coordinates."""
import argparse,hashlib,io,json,urllib.request,zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
URL="https://www2.census.gov/geo/tiger/GENZ2025/kml/cb_2025_us_state_20m.zip"
def collect(output):
    with urllib.request.urlopen(URL,timeout=90) as response:raw=response.read(10*1024*1024+1)
    if len(raw)>10*1024*1024:raise ValueError("Boundary archive exceeds limit.")
    ns={"k":"http://www.opengis.net/kml/2.2"};features=[]
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        for member in archive.namelist():
            if not member.endswith(".kml"):continue
            root=ET.fromstring(archive.read(member))
            for place in root.findall(".//k:Placemark",ns):
                properties={x.get("name"):"".join(x.itertext()) for x in place.findall(".//k:SimpleData",ns)}
                for x in place.findall(".//k:Data",ns):
                    properties[x.get("name")]="".join(x.itertext()).strip()
                name=properties.get("NAME") or place.findtext("k:name",default="",namespaces=ns)
                rings=[]
                for node in place.findall(".//k:Polygon/k:outerBoundaryIs/k:LinearRing/k:coordinates",ns):
                    ring=[]
                    for point in (node.text or "").split():
                        lon,lat,*_=point.split(",");ring.append([round(float(lon),5),round(float(lat),5)])
                    if ring:rings.append(ring)
                if rings:features.append({"name":name,"abbreviation":properties.get("STUSPS",""),"rings":rings})
    if len(features)<50:raise ValueError("Expected at least 50 state geometries.")
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps({"source_url":URL,"sha256":hashlib.sha256(raw).hexdigest(),
      "scale":"1:20,000,000","year":2025,"features":features},separators=(",",":")))
    print(json.dumps({"boundary_features":len(features),"source":URL}))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,required=True);a=p.parse_args();collect(a.output)
