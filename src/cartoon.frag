
#version 120
#extension GL_EXT_texture_array : enable
#extension GL_ARB_draw_buffers : enable

uniform sampler2D tex;
uniform vec4 far_d;
uniform bool has_fog;
uniform bool has_tex;
uniform bool has_bump;

uniform bool has_grid;
uniform vec2 gridSize;

uniform vec2 texSize; // x - size, y - 1/size
uniform vec4 init_color; //(254/256.f, 239/256.f, 97/256.f, 0);

uniform float shininess;

varying vec4 vPos;
varying vec3 normal;
varying float lightIntensity;

uniform sampler2DArrayShadow stex;
uniform sampler2D gtex; // glossy

float shadowCoef()
{
	int index = 3;
	
	// find the appropriate depth map to look up in based on the depth of this fragment
	if(gl_FragCoord.z < far_d.x)
		index = 0;
	else if(gl_FragCoord.z < far_d.y)
		index = 1;
	else if(gl_FragCoord.z < far_d.z)
		index = 2;
	
	// transform this fragment's position from view space to scaled light clip space
	// such that the xy coordinates are in [0;1]
	// note there is no need to divide by w for othogonal light sources
	vec4 shadow_coord = gl_TextureMatrix[index]*vPos;

	shadow_coord.w = shadow_coord.z;
	
	// tell glsl in which layer to do the look up
	shadow_coord.z = float(index);

	
	// Gaussian 3x3 filter
	float ret = shadow2DArray(stex, shadow_coord).x * 0.25;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( -1, -1)).x * 0.0625;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( -1, 0)).x * 0.125;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( -1, 1)).x * 0.0625;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( 0, -1)).x * 0.125;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( 0, 1)).x * 0.125;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( 1, -1)).x * 0.0625;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( 1, 0)).x * 0.125;
	ret += shadow2DArrayOffset(stex, shadow_coord, ivec2( 1, 1)).x * 0.0625;
	
	
	return ret;
}

vec4 getGridColor(vec4 vpos)
{
	vec2 pos;
	pos.x = vpos.x / gridSize.x;
	pos.y = vpos.z / gridSize.y;
	
	if (fract(pos.x) < 0.5 && fract(pos.y) < 0.5 ||
		fract(pos.x) > 0.5 && fract(pos.y) > 0.5)
		return vec4(0.3, 0.3, 0.3, 1);
	else
		return vec4(0.7, 0.7, 0.7, 1);
}

vec4 getPhongLighting(vec3 vpos, vec3 n)
{

	vec3 lightDir = normalize(vec3(gl_LightSource[0].position.xyz));
	float intensity = dot(lightDir, n);

	vec4 fColor=vec4(0.0);
	
	if (intensity > 0.95)
	    fColor = vec4(255.0/255,244.0/255,204.0/255,1.0);
	else if (intensity > 0.5)
	    fColor = vec4(255.0/255,186.0/255,158.0/255,1.0);
	else if (intensity > 0.25)
	    fColor = vec4(255.0/255,142.0/255,121.0/255,1.0);
	else 
	    fColor = vec4(255.0/255,73.0/255,61.0/255,1.0);

    vec4 dark = vec4( 0.0, 0.0, 0.0, 1.0 );
	if( lightIntensity < 0.0)
		fColor = dark;

	return fColor;
}

void main()
{
    const float shadow_ambient = 0.9;
	//vec4 color_tex = init_color;
	vec4 color_tex = vec4(1.0, 1.0, 1.0, 1.0);
	vec3 normal_bias = vec3(0.0);
	
	if (has_tex)
		color_tex = texture2D(tex, gl_TexCoord[0].st);
	
	if (has_grid)
		color_tex *= getGridColor(vPos);
		
	if (has_bump) {
		float a = 0.6;
		normal_bias = (texture2D(tex, gl_TexCoord[0].st).rgb - a)/(1-a) - 0.5;  
	}

	float shadow_coef = shadowCoef();
	float fog = clamp(gl_Fog.scale*(gl_Fog.end + vPos.z), 0.0, 1.0);
	vec4 fcolor = getPhongLighting(vPos.xyz, normalize(normal+normal_bias)) * color_tex;

	if (has_fog) {
		gl_FragData[0] = shadow_ambient * shadow_coef * fcolor + (1.0 - shadow_ambient);
	}
	else{
		gl_FragData[0] = fcolor;
	}

//	gl_FragData[0] = gl_TexCoord[0];
	gl_FragData[1] = (vPos+vec4(30.f, 30.f, 30.f, 1.f))/60.f;
	gl_FragData[2] = vec4((normalize(normal)+1.0)*0.5, 1.f);
}