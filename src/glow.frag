
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

	vec4 mat_ambient = gl_FrontMaterial.ambient;
	vec4 mat_diffuse = gl_FrontMaterial.diffuse;
	vec4 mat_specular =gl_FrontMaterial.specular;


	float mat_shininess = gl_FrontMaterial.shininess;

	vec4 diffuse = vec4(0.0);
	vec4 specular = vec4(0.0);

	// ambient term
	vec4 ambient = mat_ambient * gl_LightSource[0].ambient;
	//vec4 ambient = vec4(0.07, 0.07, 0.07, 1.0);
	
	// diffuse color
	vec4 kd = mat_diffuse * gl_LightSource[0].diffuse;
	
	// specular color
	vec4 ks = mat_specular * gl_LightSource[0].specular;

	// diffuse term
	vec3 lightDir = normalize(gl_LightSource[0].position.xyz);
	float NdotL = dot(n, lightDir);
	
	if (NdotL > 0.0)
		diffuse = kd * NdotL;
	

	// specular term
	vec3 rVector = normalize(2.0 * n * dot(n, lightDir) - lightDir);
	vec3 viewVector = normalize(-vpos);
	float RdotV = dot(rVector, viewVector);
	
	if (RdotV > 0.0 && mat_shininess > 0.0)
		specular = ks * pow(RdotV, mat_shininess) * texture2D(gtex, gl_TexCoord[0].st).r;


	vec4 rimcolor = vec4(50.0/255,5.0/255,183.0/255,1.0);//内发光颜色
	vec3 viewdir = normalize(-vpos);
	vec3 vnorm = n;
	float rim = 1.5 - clamp(dot(viewdir,vnorm),0.0,1.0);
	vec4 emmision = rimcolor*pow(rim,3);

	vec4 fColor = ambient + diffuse + specular + emmision;
	
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
		gl_FragData[0] = shadow_ambient * shadow_coef * fcolor + (1.0 - shadow_ambient) * color_tex;
	}
	else{
		gl_FragData[0] = fcolor;
	}

//	gl_FragData[0] = gl_TexCoord[0];
	gl_FragData[1] = (vPos+vec4(30.f, 30.f, 30.f, 1.f))/60.f;
	gl_FragData[2] = vec4((normalize(normal)+1.0)*0.5, 1.f);
}