// Rebuild PNG fallbacks from the favicon.svg geometry on macOS:
// swift scripts/render_branding_icons.swift (run from the repository root).
// SVG remains the scalable source. Keep its geometry and palette in sync.
import AppKit
let space=CGColorSpace(name:CGColorSpace.sRGB)!
let green=CGColor(colorSpace:space,components:[32.0/255,86.0/255,61.0/255,1])!
let keyline=CGColor(colorSpace:space,components:[199.0/255,226.0/255,205.0/255,1])!
func path() -> CGPath {
 let p=CGMutablePath();p.move(to:CGPoint(x:5,y:5));p.addLine(to:CGPoint(x:25,y:5));p.addLine(to:CGPoint(x:31,y:11));p.addLine(to:CGPoint(x:31,y:23));p.addQuadCurve(to:CGPoint(x:27,y:27),control:CGPoint(x:31,y:27));p.addLine(to:CGPoint(x:5,y:27));p.addQuadCurve(to:CGPoint(x:1,y:23),control:CGPoint(x:1,y:27));p.addLine(to:CGPoint(x:1,y:9));p.addQuadCurve(to:CGPoint(x:5,y:5),control:CGPoint(x:1,y:5));p.closeSubpath();return p
}
func render(_ size:Int,_ dark:Bool,_ touch:Bool=false) throws {
 let c=CGContext(data:nil,width:size,height:size,bitsPerComponent:8,bytesPerRow:size*4,space:space,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
 if touch {c.setFillColor(CGColor(colorSpace:space,components:[245.0/255,243.0/255,236.0/255,1])!);c.fill(CGRect(x:0,y:0,width:size,height:size))}
 c.translateBy(x:0,y:CGFloat(size));c.scaleBy(x:CGFloat(size)/32,y:-CGFloat(size)/32)
 if touch {c.translateBy(x:2,y:2);c.scaleBy(x:28.0/32,y:28.0/32)}
 if dark {c.addPath(path());c.setStrokeColor(keyline);c.setLineWidth(2);c.strokePath()}
 c.addPath(path());c.setFillColor(green);c.fillPath()
 c.setFillColor(CGColor(gray:1,alpha:1))
 for x in [9.0,16.0,23.0] {c.fillEllipse(in:CGRect(x:x-1.9,y:9.6,width:3.8,height:3.8))}
 c.addPath(CGPath(roundedRect:CGRect(x:4,y:17,width:24,height:5),cornerWidth:1.5,cornerHeight:1.5,transform:nil));c.fillPath()
 let rep=NSBitmapImageRep(cgImage:c.makeImage()!)
 let name=touch ? "apple-touch-icon.png" : "favicon-\(dark ? "dark-" : "")\(size).png"
 try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:"public/branding/"+name))
}
for size in [16,32,48] {try render(size,false);try render(size,true)}
try render(180,false,true)
