const apiUrl = "http://hi-inter.aclab.tw/db";
const NumPoints = 64;
const SquareSize = 250.0;
const Diagonal = Math.sqrt(SquareSize * SquareSize + SquareSize * SquareSize);
const HalfDiagonal = 0.5 * Diagonal;
const AngleRange = Deg2Rad(45.0);
const AnglePrecision = Deg2Rad(2.0);
const Phi = 0.5 * (-1.0 + Math.sqrt(5.0)); // Golden Ratio

/**
 * The $1 Unistroke Recognizer (JavaScript version)
 *
 *  Jacob O. Wobbrock, Ph.D.
 *  The Information School
 *  University of Washington
 *  Seattle, WA 98195-2840
 *  wobbrock@uw.edu
 *
 *  Andrew D. Wilson, Ph.D.
 *  Microsoft Research
 *  One Microsoft Way
 *  Redmond, WA 98052
 *  awilson@microsoft.com
 *
 *  Yang Li, Ph.D.
 *  Department of Computer Science and Engineering
 *  University of Washington
 *  Seattle, WA 98195-2840
 *  yangli@cs.washington.edu
 *
 * The academic publication for the $1 recognizer, and what should be
 * used to cite it, is:
 *
 *     Wobbrock, J.O., Wilson, A.D. and Li, y. (2007). Gestures without
 *     libraries, toolkits or training: A $1 recognizer for user interface
 *     prototypes. Proceedings of the ACM Symposium on User Interface
 *     Software and Technology (UIST '07). Newport, Rhode Island (October
 *     7-10, 2007). New York: ACM Press, pp. 159-168.
 *     https://dl.acm.org/citation.cfm?id=1294238
 *
 * The Protractor enhancement was separately published by Yang Li and programmed
 * here by Jacob O. Wobbrock:
 *
 *     Li, y. (2010). Protractor: A fast and accurate gesture
 *     recognizer. Proceedings of the ACM Conference on Human
 *     Factors in Computing Systems (CHI '10). Atlanta, Georgia
 *     (April 10-15, 2010). New York: ACM Press, pp. 2169-2172.
 *     https://dl.acm.org/citation.cfm?id=1753654
 *
 * This software is distributed under the "New BSD License" agreement:
 *
 * Copyright (C) 2007-2012, Jacob O. Wobbrock, Andrew D. Wilson and Yang Li.
 * All rights reserved. Last updated July 14, 2018.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *    * Neither the names of the University of Washington nor Microsoft,
 *      nor the names of its contributors may be used to endorse or promote
 *      products derived from this software without specific prior written
 *      permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Jacob O. Wobbrock OR Andrew D. Wilson
 * OR Yang Li BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

class Point {
  /** @param { Number } x @param { Number } y */
  constructor(x, y) {
    /** @type number */
    this.x = x;
    /** @type number */
    this.y = y;
  }
}

const Origin = new Point(0, 0);

class Rectangle {
  /** @param { Number } x @param { Number }y @param { Number } width @param { Number } height */
  constructor(x, y, width, height) {
    /** @type number */
    this.x = x;
    /** @type number */
    this.y = y;
    /** @type number */
    this.Width = width;
    /** @type number */
    this.Height = height;
  }
}

class Unistroke {
  /** @param { string } name @param { Point[] } points */
  constructor(name, points) {
    /** @type string */
    this.Name = name;
    this.Points = Resample(points, NumPoints);
    let radians = IndicativeAngle(this.Points);
    this.Points = RotateBy(this.Points, -radians);
    this.Points = ScaleTo(this.Points, SquareSize);
    this.Points = TranslateTo(this.Points, Origin);
    this.Vector = Vectorize(this.Points); // for Protractor
  }
}

class Result {
  constructor(name, score, ms) {
    this.Name = name;
    this.Score = score;
    this.Time = ms;
  }
}

class DollarRecognizer {
  constructor() {
    /** @type Unistroke[] */
    this.Unistroke = [];
  }

  initData = async () => {
    let data = await Promise.resolve(fetch(apiUrl).then((data) => data.json()));
    for (let key in data)
      for (let items of data[key])
        this.Unistroke.push(
          new Unistroke(
            key,
            items["location"].map(({ x, y }) => new Point(x, y))
          )
        );
  };

  Recognize(points, useProtractor) {
    let time_start = Date.now();
    let candidate = new Unistroke("", points);

    let result = null;
    let best = +Infinity;
    for (let strokes of this.Unistroke) {
      let distance = useProtractor
        ? OptimalCosineDistance(strokes.Vector, candidate.Vector)
        : DistanceAtBestAngle(candidate.Points, strokes, -AngleRange, +AngleRange, AnglePrecision);
      if (distance < best) {
        best = distance;
        result = strokes;
      }
    }
    return result
      ? new Result(result.Name, useProtractor ? 1.0 - best : 1.0 - best / HalfDiagonal, Date.now() - time_start)
      : new Result("No match.", 0.0, Date.now() - time_start);
  }

  AddGesture = async (name, points) => {
    await Promise.resolve(
      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: name, location: points }),
      }).then((data) => data.json())
    );
    this.Unistroke.push(new Unistroke(name, points));
    return this.Unistroke.findIndex((item) => item.Name === name);
  };
}
//
// Private helper functions from here on down
//

/** @param { Point[] } points @param { Number } n @return {number} */
function Resample(points, n) {
  let interval = PathLength(points) / (n - 1); // interval length
  let distance = 0.0;
  let newpoints = new Array(points[0]);
  for (let i = 1; i < points.length; i++) {
    let d = Distance(points[i - 1], points[i]);
    if (distance + d >= interval) {
      let qx = points[i - 1].x + ((interval - distance) / d) * (points[i].x - points[i - 1].x);
      let qy = points[i - 1].y + ((interval - distance) / d) * (points[i].y - points[i - 1].y);
      let q = new Point(qx, qy);
      newpoints.push(q); // append new point 'q'
      points.splice(i, 0, q); // insert 'q' at position i in points s.t. 'q' will be the next i
      distance = 0.0;
    } else distance += d;
  }
  if (newpoints.length == n - 1)
    // somtimes we fall a rounding-error short of adding the last point, so add it if so
    newpoints.push(new Point(points[points.length - 1].x, points[points.length - 1].y));
  return newpoints;
}

/** @param { Point[] } points */
function IndicativeAngle(points) {
  let c = Centroid(points);
  return Math.atan2(c.y - points[0].y, c.x - points[0].x);
}

/** @param { Point[] } points @param { Number } radians */
function RotateBy(points, radians) {
  // rotates points around centroid
  let center = Centroid(points);
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  return points.map(({ x, y }) => {
    return new Point(
      (x - center.x) * cos - (y - center.y) * sin + center.x,
      (x - center.x) * sin + (y - center.y) * cos + center.y
    );
  });
}

/** @param { Point[] } points @param { Number } size */
function ScaleTo(points, size) {
  // non-uniform scale; assumes 2D gestures (i.e., no lines)
  let { Width, Height } = BoundingBox(points);
  return points.map((item) => {
    return new Point((item.x * size) / Width, (item.y * size) / Height);
  });
}

/** @param { Point[] } points @param { Point } pt */
function TranslateTo(points, pt) {
  // translates points' centroid
  let c = Centroid(points);
  return points.map(({ x, y }) => {
    return new Point(x + pt.x - c.x, y + pt.y - c.y);
  });
}

/** @param { Point[] } points */
function Vectorize(points) {
  // for Protractor
  let sum = 0.0;
  let vector = new Array();
  for (let { x, y } of points) {
    vector.push(x);
    vector.push(y);
    sum += x * x + y * y;
  }
  let magnitude = Math.sqrt(sum);
  return vector.map((item) => item / magnitude);
}


function OptimalCosineDistance(v1, v2) {
  // for Protractor
  let a = 0.0;
  let b = 0.0;
  for (let i = 0; i < v1.length; i += 2) {
    a += v1[i] * v2[i] + v1[i + 1] * v2[i + 1];
    b += v1[i] * v2[i + 1] - v1[i + 1] * v2[i];
  }
  let angle = Math.atan(b / a);
  return Math.acos(a * Math.cos(angle) + b * Math.sin(angle));
}

function DistanceAtBestAngle(points, T, a, b, threshold) {
  let x1 = Phi * a + (1.0 - Phi) * b;
  let f1 = DistanceAtAngle(points, T, x1);
  let x2 = (1.0 - Phi) * a + Phi * b;
  let f2 = DistanceAtAngle(points, T, x2);
  while (Math.abs(b - a) > threshold) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = Phi * a + (1.0 - Phi) * b;
      f1 = DistanceAtAngle(points, T, x1);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1.0 - Phi) * a + Phi * b;
      f2 = DistanceAtAngle(points, T, x2);
    }
  }
  return Math.min(f1, f2);
}
function DistanceAtAngle(points, T, radians) {
  let newpoints = RotateBy(points, radians);
  return PathDistance(newpoints, T.Points);
}
function Centroid(points) {
  let x = 0.0,
    y = 0.0;
  for (let i = 0; i < points.length; i++) {
    x += points[i].x;
    y += points[i].y;
  }
  x /= points.length;
  y /= points.length;
  return new Point(x, y);
}

/** @param { Point[] } points */
function BoundingBox(points) {
  let minX = +Infinity,
    maxX = -Infinity,
    minY = +Infinity,
    maxY = -Infinity;
  for (let { x, y } of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return new Rectangle(minX, minY, maxX - minX ? maxX - minX : 1, maxY - minY ? maxY - minY : 1);
}
function PathDistance(pts1, pts2) {
  let d = 0.0;
  for (
    let i = 0;
    i < pts1.length;
    i++ // assumes pts1.length == pts2.length
  )
    d += Distance(pts1[i], pts2[i]);
  return d / pts1.length;
}

/** @param { Point[] } points */
function PathLength(points) {
  let d = 0.0;
  for (let i = 1; i < points.length; i++) d += Distance(points[i - 1], points[i]);
  return d;
}

/** @param { Point } p1 @param { Point } p2 */
function Distance(p1, p2) {
  // console.log(p1, p2)
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function Deg2Rad(d) {
  return (d * Math.PI) / 180.0;
}
