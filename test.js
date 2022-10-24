var _isDown, _points, _r, _g, _rc;
		function onLoadEvent()
		{
			_points = new Array();
			_r = new DollarRecognizer();

			_r.initData();
			
			

			var canvas = document.getElementById('myCanvas');
			_g = canvas.getContext('2d');
			_g.fillStyle = "rgb(0,0,225)";
			_g.strokeStyle = "rgb(0,0,225)";
			_g.lineWidth = 3;
			_g.font = "16px Gentilis";
			_rc = getCanvasRect(canvas); // canvas rect on page
			_g.fillStyle = "rgb(255,255,136)";
			_g.fillRect(0, 0, _rc.width, 20);

			_isDown = false;
		}
		function getCanvasRect(canvas)
		{
			var w = canvas.width;
			var h = canvas.height;

			var cx = canvas.offsetLeft;
			var cy = canvas.offsetTop;
			while (canvas.offsetParent != null)
			{
				canvas = canvas.offsetParent;
				cx += canvas.offsetLeft;
				cy += canvas.offsetTop;
			}
			return {x: cx, y: cy, width: w, height: h};
		}
		function getScrollX()
		{
			var scrollX = $(window).scrollLeft();
			return scrollX;
		}
		function getScrollY()
		{
			var scrollY = $(window).scrollTop();
			return scrollY;
		}
		//
		// Mouse Events
		//
		function mouseDownEvent(x, y, button)
		{
			document.onselectstart = function() { return false; } // disable drag-select
			document.onmousedown = function() { return false; } // disable drag-select
			if (button <= 1)
			{
				_isDown = true;
				x -= _rc.x - getScrollX();
				y -= _rc.y - getScrollY();
				if (_points.length > 0)
					_g.clearRect(0, 0, _rc.width, _rc.height);
				_points.length = 1; // clear
				_points[0] = new Point(x, y);
				drawText("Recording unistroke...");
				_g.fillRect(x - 4, y - 3, 9, 9);
			}
			else if (button == 2)
			{
				drawText("Recognizing gesture...");
			}
		}
		function mouseMoveEvent(x, y, button)
		{
			if (_isDown)
			{
				x -= _rc.x - getScrollX();
				y -= _rc.y - getScrollY();
				_points[_points.length] = new Point(x, y); // append
				drawConnectedPoint(_points.length - 2, _points.length - 1);
			}
		}
		function mouseUpEvent(x, y, button)
		{
			document.onselectstart = function() { return true; } // enable drag-select
			document.onmousedown = function() { return true; } // enable drag-select
			if (_isDown || button == 2)
			{
				_isDown = false;
				if (_points.length >= 10)
				{
					var result = _r.Recognize(_points, document.getElementById('useProtractor').checked);
					drawText("Result: " + result.Name + " (" + round(result.Score,2) + ") in " + result.Time + " ms.");
				}
				else // fewer than 10 points were inputted
				{
					drawText("Too few points made. Please try again.");
				}
			}
		}
		function drawText(str)
		{
			_g.fillStyle = "rgb(255,255,136)";
			_g.fillRect(0, 0, _rc.width, 20);
			_g.fillStyle = "rgb(0,0,255)";
			_g.fillText(str, 1, 14);
		}
		function drawConnectedPoint(from, to)
		{
			_g.beginPath();
			_g.moveTo(_points[from].x, _points[from].y);
			_g.lineTo(_points[to].x, _points[to].y);
			_g.closePath();
			_g.stroke();
		}
		function round(n, d) // round 'n' to 'd' decimals
		{
			d = Math.pow(10, d);
			return Math.round(n * d) / d;
		}
		//
		// Unistroke Adding and Clearing
		//
		function onClickAddExisting()
		{
			if (_points.length >= 10)
			{
				var unistrokes = document.getElementById('unistrokes');
				var name = unistrokes[unistrokes.selectedIndex].value;
				var num = _r.AddGesture(name, _points);
				drawText("\"" + name + "\" added. No. of \"" + name + "\" defined: " + num + ".");
			}
		}
		function onClickAddCustom()
		{
			var name = document.getElementById('custom').value;
			if (_points.length >= 10 && name.length > 0)
			{
				var num = _r.AddGesture(name, _points);
				drawText("\"" + name + "\" added. No. of \"" + name + "\" defined: " + num + ".");
			}
		}
		function onClickCustom()
		{
			document.getElementById('custom').select();
		}
		function onClickDelete()
		{
			var num = _r.DeleteUserGestures(); // deletes any user-defined unistrokes
			alert("All user-defined gestures have been deleted. Only the 1 predefined gesture remains for each of the " + num + " types.");
		}